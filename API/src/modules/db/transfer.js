const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Workspace = require('../../db/models/workspace.model');
const Flow = require('../../db/models/flow.model');
const App = require('../../db/models/app.model');
const Credential = require('../../db/models/credential.model');
const { validateFlowGraph } = require('../../utils/validate');
const NodeTemplate = require('../../db/models/node-template.model');
const Notification = require('../../db/models/notification.model');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.post('/workspaces/:wsId/transfer', async (req, res) => {
    const source = await Workspace.findById(req.params.wsId);
    if (!source || String(source.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Source workspace not found');
    const { targetWorkspaceId, items = [], force = false } = req.body || {};
    const target = await Workspace.findById(targetWorkspaceId);
    if (!target || String(target.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Target workspace not found');

    const result = { created: [], failed: [] };
    for (const it of items){
      try {
        if (it.type === 'flow'){
          const f = await Flow.findById(it.id); if (!f) throw new Error('flow_not_found');
          const loaders = {
            getTemplateByKey: async (key) => NodeTemplate.findOne({ key }).lean(),
            isTemplateAllowed: async (key) => (target.templatesAllowed || []).length === 0 || target.templatesAllowed.includes(key),
          };
          const v = await validateFlowGraph(f.graph || f, { strict: true, loaders });
          if (!v.ok && !force) throw Object.assign(new Error('flow_invalid'), { details: v });
          const graphCopy = remapGraphIds(f.graph || f);
          const copy = await Flow.create({ name: f.name + ' (Copy)', workspaceId: target._id, status: 'draft', enabled: v.ok ? f.enabled : false, graph: graphCopy });
          if (!v.ok){
            await Notification.create({ companyId: target.companyId, workspaceId: target._id, entityType: 'flow', entityId: String(copy._id), severity: 'critical', code: 'flow_invalid', message: 'Flow copied but disabled in target workspace', details: v, link: `/flows/${copy._id}/editor` });
          }
          result.created.push({ type: 'flow', id: String(copy._id) });
        } else if (it.type === 'credential'){
          const c = await Credential.findById(it.id); if (!c) throw new Error('credential_not_found');
          const copy = await Credential.create({ name: c.name + ' (Copy)', providerKey: c.providerKey, workspaceId: target._id, secret: c.secret });
          result.created.push({ type: 'credential', id: String(copy._id) });
        } else if (it.type === 'app'){
          const a = await App.findById(it.id); if (!a) throw new Error('app_not_found');
          const copy = await App.create({ name: a.name + ' (Copy)', providerId: a.providerId, workspaceId: target._id, config: a.config, createdBy: req.user.id });
          result.created.push({ type: 'app', id: String(copy._id) });
        } else {
          throw new Error('unsupported_type');
        }
      } catch (e) {
        result.failed.push({ type: it.type, id: it.id, error: e.message, details: e.details || null });
      }
    }
    res.apiOk(result);
  });

  return r;
}

function remapGraphIds(graph){
  const g = JSON.parse(JSON.stringify(graph || { nodes: [], edges: [] }));
  const map = new Map();
  for (const n of (g.nodes || [])){
    const nn = n.id + '_' + Math.random().toString(36).slice(2,6);
    map.set(n.id, nn);
    n.id = nn;
  }
  for (const e of (g.edges || [])){
    if (map.has(e.source)) e.source = map.get(e.source);
    if (map.has(e.target)) e.target = map.get(e.target);
    if (e.id) e.id = e.id + '_' + Math.random().toString(36).slice(2,4);
  }
  return g;
}
