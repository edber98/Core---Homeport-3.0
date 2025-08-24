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
    const list = await App.find({ workspaceId: ws._id }).lean();
    res.apiOk(list);
  });

  r.post('/workspaces/:wsId/apps', async (req, res) => {
    const ws = await Workspace.findById(req.params.wsId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const body = req.body || {};
    const app = await App.create({ name: String(body.name||'App'), providerId: body.providerId, workspaceId: ws._id, config: body.config || {}, createdBy: req.user.id });
    res.status(201).json({ success: true, data: app, requestId: req.requestId, ts: Date.now() });
  });

  r.put('/apps/:id', async (req, res) => {
    const app = await App.findById(req.params.id);
    if (!app) return res.apiError(404, 'app_not_found', 'App not found');
    const ws = await Workspace.findById(app.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'app_not_found', 'App not found');
    Object.assign(app, req.body || {});
    await app.save();
    res.apiOk(app);
  });
  return r;
}
