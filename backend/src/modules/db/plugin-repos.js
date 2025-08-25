const express = require('express');
const { authMiddleware, requireCompanyScope, requireAdmin } = require('../../auth/jwt');
const PluginRepo = require('../../db/models/plugin-repo.model');
const { registry } = require('../../plugins/registry');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.get('/plugin-repos', async (req, res) => {
    const q = { $or: [ { companyId: null }, { companyId: req.user.companyId } ] };
    let { limit = 100, page = 1, q: search, sort } = req.query;
    limit = Math.max(1, Math.min(200, Number(limit) || 100));
    page = Math.max(1, Number(page) || 1);
    const findQ = { ...q };
    if (search) Object.assign(findQ, { $or: [ { name: { $regex: String(search), $options: 'i' } }, { type: { $regex: String(search), $options: 'i' } } ] });
    let sortObj = { createdAt: -1 };
    if (typeof sort === 'string') { const [f,d] = String(sort).split(':'); if (f) sortObj = { [f]: (d === 'asc' ? 1 : -1) }; }
    const list = await PluginRepo.find(findQ)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    res.apiOk(list);
  });

  r.post('/plugin-repos', requireAdmin(), async (req, res) => {
    const body = req.body || {};
    const repo = await PluginRepo.create({ name: body.name, type: body.type || 'local', path: body.path || null, url: body.url || null, branch: body.branch || null, companyId: body.companyId || null, enabled: body.enabled !== false });
    res.status(201).json({ success: true, data: repo, requestId: req.requestId, ts: Date.now() });
  });

  r.put('/plugin-repos/:id', requireAdmin(), async (req, res) => {
    const repo = await PluginRepo.findById(req.params.id);
    if (!repo) return res.apiError(404, 'plugin_repo_not_found', 'Plugin repo not found');
    Object.assign(repo, req.body || {}); await repo.save();
    res.apiOk(repo);
  });

  r.post('/plugin-repos/reload', requireAdmin(), async (_req, res) => {
    // Add base dirs for enabled local repos then reload
    const repos = await PluginRepo.find({ enabled: true, type: 'local' });
    for (const rp of repos){ if (rp.path) registry.addBaseDir(rp.path); }
    const loaded = registry.reload();
    res.apiOk({ loaded, repos: repos.map(r => r.path) });
  });

  return r;
}
