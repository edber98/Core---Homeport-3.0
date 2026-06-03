const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Provider = require('../../db/models/provider.model');
const NodeTemplate = require('../../db/models/node-template.model');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());
  r.get('/providers', async (req, res) => {
    let { limit = 1000, page = 1 } = req.query;
    limit = Math.max(1, Math.min(5000, Number(limit) || 1000));
    page = Math.max(1, Number(page) || 1);
    const { q, sort } = req.query;
    // Hide providers when all their repos are disabled
    const PluginRepo = require('../../db/models/plugin-repo.model');
    const enabledRepos = await PluginRepo.find({ enabled: true }).select('_id').lean();
    const enabledRepoIds = (enabledRepos || []).map(r => r._id);
    const enabledIds = new Set(enabledRepoIds.map(id => String(id)));
    const filters = [{ enabled: true }];
    if (q) {
      const rx = { $regex: String(q), $options: 'i' };
      filters.push({ $or: [ { key: rx }, { name: rx }, { title: rx }, { tags: rx }, { categories: rx } ] });
    }
    let sortObj = { name: 1 };
    if (typeof sort === 'string') {
      const [field, dir] = String(sort).split(':');
      if (field) sortObj = { [field]: (dir === 'desc' ? -1 : 1) };
    }
    filters.push({
        $or: [
          { repos: { $exists: false } },
          { repos: { $size: 0 } },
          { repos: { $in: [...enabledIds] } },
        ],
      });
    const query = filters.length === 1 ? filters[0] : { $and: filters };
    const list = await Provider.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    if (!list.length) return res.apiOk(list);

    // Count templates per provider without loading templates payloads.
    const providerKeys = Array.from(new Set(list.map(p => String(p?.key || '').trim()).filter(Boolean)));
    let countsByProvider = new Map();
    if (providerKeys.length) {
      const templateFilters = [
        { enabled: { $ne: false } },
        { providerKey: { $in: providerKeys } },
        {
          $or: [
            { repos: { $exists: false } },
            { repos: { $size: 0 } },
            { repos: { $in: enabledRepoIds } },
          ],
        },
      ];
      const templateQuery = { $and: templateFilters };
      const counts = await NodeTemplate.aggregate([
        { $match: templateQuery },
        { $group: { _id: '$providerKey', count: { $sum: 1 } } },
      ]);
      countsByProvider = new Map((counts || []).map(c => [String(c?._id || ''), Number(c?.count || 0)]));
    }

    const enriched = list.map((p) => ({
      ...p,
      nodeTemplateCount: countsByProvider.get(String(p?.key || '')) || 0,
    }));
    res.apiOk(enriched);
  });

  const { requireAdmin } = require('../../auth/jwt');
  r.put('/providers/:key', requireAdmin(), async (req, res) => {
    const key = req.params.key; const patch = req.body || {};
    const force = (String(req.query.force || '').toLowerCase() === '1' || String(req.query.force || '').toLowerCase() === 'true' || !!patch.force);
    delete patch.force;
    const p = await Provider.findOne({ key });
    if (!p) return res.apiError(404, 'provider_not_found', 'Provider not found');
    const old = p.toObject();
    // Predict impact if hasCredentials/allowWithoutCredentials changes
    const requiresChanged = (patch.hasCredentials != null && !!patch.hasCredentials !== !!old.hasCredentials) || (patch.allowWithoutCredentials != null && !!patch.allowWithoutCredentials !== !!old.allowWithoutCredentials);
    if (requiresChanged){
      const Flow = require('../../db/models/flow.model');
      const Workspace = require('../../db/models/workspace.model');
      const NodeTemplate = require('../../db/models/node-template.model');
      const Credential = require('../../db/models/credential.model');
      const Notification = require('../../db/models/notification.model');
      const Run = require('../../db/models/run.model');
      const { validateFlowGraph } = require('../../utils/validate');
      const flows = await Flow.find().lean();
      const impacted = [];
      for (const f of flows){
        const ws = await Workspace.findById(f.workspaceId).lean(); if (!ws) continue;
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
        return res.apiError(400, 'provider_update_breaks_flows', 'Provider update invalidates flows', { impacted });
      }
      if (impacted.length && force){
        for (const it of impacted){
          const f = await Flow.findById(it.flowId);
          if (f) { f.enabled = false; await f.save(); }
          await Run.updateMany({ flowId: it.flowId, status: 'running' }, { $set: { status: 'cancelled', finishedAt: new Date() } });
          await Notification.create({ companyId: it.companyId, workspaceId: it.workspaceId, entityType: 'flow', entityId: it.flowId, severity: 'critical', code: 'provider_update_invalid', message: `Flow désactivé suite à la mise à jour du provider '${key}'`, details: { errors: it.errors }, link: `/flows/${it.flowId}/editor` });
        }
      }
    }
    Object.assign(p, patch);
    if (patch.credentialsForm != null) p.markModified('credentialsForm');
    if (patch.auth != null) p.markModified('auth');
    await p.save();
    res.apiOk(p);
  });
  return r;
}
