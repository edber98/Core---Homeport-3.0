const express = require('express');
const { authMiddleware, requireCompanyScope, requireAdmin } = require('../../auth/jwt');
const NodeTemplate = require('../../db/models/node-template.model');
const Workspace = require('../../db/models/workspace.model');
const Flow = require('../../db/models/flow.model');
const Notification = require('../../db/models/notification.model');
const { validateFlowGraph } = require('../../utils/validate');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.get('/node-templates', async (req, res) => {
    const { category } = req.query;
    let { limit = 100, page = 1 } = req.query;
    limit = Math.max(1, Math.min(200, Number(limit) || 100));
    page = Math.max(1, Number(page) || 1);
    const { q, sort } = req.query;
    const query = category ? { category } : {};
    if (q) {
      const rx = { $regex: String(q), $options: 'i' };
      Object.assign(query, { $or: [ { key: rx }, { name: rx }, { title: rx }, { category: rx }, { tags: rx } ] });
    }
    let sortObj = { name: 1 };
    if (typeof sort === 'string') { const [f,d] = String(sort).split(':'); if (f) sortObj = { [f]: (d === 'desc' ? -1 : 1) }; }
    const list = await NodeTemplate.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    res.apiOk(list);
  });

  function sanitizeName(name){
    return String(name || '').trim().replace(/\s+/g, '_');
  }

  r.post('/node-templates', requireAdmin(), async (req, res) => {
    const body = req.body || {};
    if (body && body.name) body.name = sanitizeName(body.name);
    if (!body.title && body.name) body.title = body.name;
    if (!body.subtitle && body.providerKey) body.subtitle = body.providerKey;
    const t = await NodeTemplate.create(body);
    res.status(201).json({ success: true, data: t, requestId: req.requestId, ts: Date.now() });
  });

  r.put('/node-templates/:key', requireAdmin(), async (req, res) => {
    const { key } = req.params; const patch = req.body || {};
    const force = (String(req.query.force || '').toLowerCase() === '1' || String(req.query.force || '').toLowerCase() === 'true' || !!patch.force);
    const tpl = await NodeTemplate.findOne({ key });
    if (!tpl) return res.apiError(404, 'template_not_found', 'Node template not found');
    const old = tpl.toObject();
    if (patch && patch.name) patch.name = sanitizeName(patch.name);
    if (!patch.title && patch.name) patch.title = patch.name;
    if (!patch.subtitle && (patch.providerKey || tpl.providerKey)) patch.subtitle = patch.providerKey || tpl.providerKey;
    Object.assign(tpl, patch); await tpl.save();

    // If args (form) changed, flag impacted flows (optional)
    const schemaChanged = JSON.stringify(old.args || {}) !== JSON.stringify(tpl.args || {});
    if (schemaChanged){
      // get all flows in company scope? templates are global, validate all flows
      const flows = await Flow.find();
      const impacted = [];
      const Provider = require('../../db/models/provider.model');
      const Credential = require('../../db/models/credential.model');
      for (const f of flows){
        const ws = await Workspace.findById(f.workspaceId).lean();
        const loaders = {
          getTemplateByKey: async (k) => NodeTemplate.findOne({ key: k }).lean(),
          isTemplateAllowed: async () => true,
          getProviderByKey: async (k) => Provider.findOne({ key: k }).lean(),
          hasCredential: async (providerKey) => !!(await Credential.exists({ providerKey, workspaceId: ws._id })),
        };
        const v = await validateFlowGraph(f.graph || f, { strict: true, loaders });
        if (!v.ok){
          // restrict to errors about this template key
          // keep all errors; FE can filter by node if needed
          impacted.push({ flowId: String(f._id), workspaceId: String(ws._id), companyId: String(ws.companyId), name: f.name, errors: v.errors });
        }
      }
      if (impacted.length && !force){
        return res.apiError(400, 'template_update_breaks_flows', 'Template update invalidates flows', { impacted });
      }
      if (impacted.length && force){
        const Run = require('../../db/models/run.model');
        for (const it of impacted){
          const f = await Flow.findById(it.flowId);
          if (f) { f.enabled = false; await f.save(); }
          await Run.updateMany({ flowId: it.flowId, status: 'running' }, { $set: { status: 'cancelled', finishedAt: new Date() } });
          await Notification.create({ companyId: it.companyId, workspaceId: it.workspaceId, entityType: 'flow', entityId: it.flowId, severity: 'critical', code: 'flow_invalid', message: `Flow disabled due to template '${key}' update`, details: { errors: it.errors }, link: `/flows/${it.flowId}/editor` });
        }
      }
      return res.apiOk({ template: tpl, impacted });
    }
    res.apiOk({ template: tpl, impacted: [] });
  });

  // Delete a template with impact analysis
  r.delete('/node-templates/:key', requireAdmin(), async (req, res) => {
    const { key } = req.params; const force = !!(req.query.force === '1' || req.body?.force);
    const tpl = await NodeTemplate.findOne({ key });
    if (!tpl) return res.apiError(404, 'template_not_found', 'Node template not found');
    // Simulate deletion by validating flows without this template present
    await tpl.deleteOne();
    const flows = await Flow.find();
    const Provider = require('../../db/models/provider.model');
    const Credential = require('../../db/models/credential.model');
    const impacted = [];
    for (const f of flows){
      const ws = await Workspace.findById(f.workspaceId).lean();
      const loaders = {
        getTemplateByKey: async (k) => NodeTemplate.findOne({ key: k }).lean(),
        isTemplateAllowed: async () => true,
        getProviderByKey: async (k) => Provider.findOne({ key: k }).lean(),
        hasCredential: async (providerKey) => !!(await Credential.exists({ providerKey, workspaceId: ws._id })),
      };
      const v = await validateFlowGraph(f.graph || f, { strict: true, loaders });
      if (!v.ok) impacted.push({ flowId: String(f._id), workspaceId: String(ws._id), companyId: String(ws.companyId), name: f.name, errors: v.errors });
    }
    if (impacted.length && !force){
      return res.apiError(400, 'template_delete_breaks_flows', 'Deleting template invalidates flows', { impacted });
    }
    if (impacted.length && force){
      const Run = require('../../db/models/run.model');
      for (const it of impacted){
        const f = await Flow.findById(it.flowId);
        if (f) { f.enabled = false; await f.save(); }
        await Run.updateMany({ flowId: it.flowId, status: 'running' }, { $set: { status: 'cancelled', finishedAt: new Date() } });
        await Notification.create({ companyId: it.companyId, workspaceId: it.workspaceId, entityType: 'flow', entityId: it.flowId, severity: 'critical', code: 'template_deleted', message: `Flow disabled due to deleted template '${key}'`, details: { errors: it.errors }, link: `/flows/${it.flowId}/editor` });
      }
    }
    res.apiOk({ deleted: true, key, impacted });
  });
  return r;
}
