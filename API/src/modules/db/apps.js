const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Workspace = require('../../db/models/workspace.model');
const App = require('../../db/models/app.model');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.get('/workspaces/:wsId/apps', async (req, res) => {
    const ws = await Workspace.findById(req.params.wsId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    // Enforce membership
    const WorkspaceMembership = require('../../db/models/workspace-membership.model');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    let { limit = 100, page = 1, q, sort } = req.query;
    limit = Math.max(1, Math.min(200, Number(limit) || 100));
    page = Math.max(1, Number(page) || 1);
    const query = { workspaceId: ws._id };
    if (q) query['name'] = { $regex: String(q), $options: 'i' };
    let sortObj = { createdAt: -1 };
    if (typeof sort === 'string') { const [f,d] = String(sort).split(':'); if (f) sortObj = { [f]: (d === 'asc' ? 1 : -1) }; }
    const list = await App.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    res.apiOk(list);
  });

  r.post('/workspaces/:wsId/apps', async (req, res) => {
    const ws = await Workspace.findById(req.params.wsId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const WorkspaceMembership = require('../../db/models/workspace-membership.model');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    const body = req.body || {};
    const app = await App.create({ name: String(body.name||'App'), providerId: body.providerId, workspaceId: ws._id, config: body.config || {}, createdBy: req.user.id });
    res.status(201).json({ success: true, data: app, requestId: req.requestId, ts: Date.now() });
  });

  r.put('/apps/:id', async (req, res) => {
    const app = await App.findById(req.params.id);
    if (!app) return res.apiError(404, 'app_not_found', 'App not found');
    const ws = await Workspace.findById(app.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'app_not_found', 'App not found');
    const WorkspaceMembership = require('../../db/models/workspace-membership.model');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    Object.assign(app, req.body || {});
    await app.save();
    res.apiOk(app);
  });
  return r;
}
