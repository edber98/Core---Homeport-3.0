const express = require('express');
const { authMiddleware, requireCompanyScope, requireAdmin } = require('../../auth/jwt');
const PluginRepo = require('../../db/models/plugin-repo.model');
const { registry } = require('../../plugins/registry');
const path = require('path');

async function ensureDefaultLocal(){
  try {
    const defaultPath = path.resolve(__dirname, '../../plugins/local');
    const exists = await PluginRepo.findOne({ type: 'local', path: defaultPath, companyId: null }).lean();
    if (!exists) {
      await PluginRepo.create({ name: 'Local (built-in)', type: 'local', path: defaultPath, companyId: null, enabled: true, status: 'builtin' });
    }
  } catch {}
}

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.get('/plugin-repos', async (req, res) => {
    await ensureDefaultLocal();
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
      .select('-gitSecret')
      .lean();
    res.apiOk(list);
  });

  r.post('/plugin-repos', requireAdmin(), async (req, res) => {
    const body = req.body || {};
    const doc = { name: body.name, type: body.type || 'local', path: body.path || null, url: body.url || null, branch: body.branch || null, companyId: body.companyId || null, enabled: body.enabled !== false };
    // Normalize local path: allow relative path from project root (process.cwd())
    if (doc.type === 'local' && doc.path) { doc.path = require('path').isAbsolute(doc.path) ? doc.path : require('path').resolve(process.cwd(), doc.path); }
    if (body.gitAuth) doc.gitAuth = body.gitAuth;
    if (body.gitUsername != null) doc.gitUsername = body.gitUsername;
    if (body.gitPassword || body.gitToken || body.sshPrivateKey || body.sshPassphrase) {
      const { encrypt } = require('../../utils/enc');
      doc.gitSecret = encrypt({ password: body.gitPassword, token: body.gitToken, privateKey: body.sshPrivateKey, passphrase: body.sshPassphrase });
    }
    const repo = await PluginRepo.create(doc);
    const safe = repo.toObject(); delete safe.gitSecret;
    res.status(201).json({ success: true, data: safe, requestId: req.requestId, ts: Date.now() });
  });

  r.put('/plugin-repos/:id', requireAdmin(), async (req, res) => {
    const repo = await PluginRepo.findById(req.params.id);
    if (!repo) return res.apiError(404, 'plugin_repo_not_found', 'Plugin repo not found');
    const defaultPath = path.resolve(__dirname, '../../plugins/local');
    const isBuiltin = repo.type === 'local' && path.resolve(repo.path || '') === defaultPath && !repo.companyId;
    const patch = req.body || {};
    if (isBuiltin) {
      const forbidden = ['type','path','url','branch','enabled'];
      if (Object.keys(patch).some(k => forbidden.includes(k))) {
        return res.apiError(400, 'forbidden', 'Cannot modify built-in local repository');
      }
    }
    // handle credentials
    const { encrypt } = require('../../utils/enc');
    const sec = {};
    if (patch.gitPassword) sec.password = patch.gitPassword;
    if (patch.gitToken) sec.token = patch.gitToken;
    if (patch.gitUsername != null) repo.gitUsername = patch.gitUsername;
    if (Object.keys(sec).length) repo.gitSecret = encrypt(sec);
    // remove sensitive fields from patch
    delete patch.gitPassword; delete patch.gitToken; delete patch.gitSecret; delete patch.gitUsername;
    // Normalize local path if provided
    if (patch.path && (repo.type === 'local' || patch.type === 'local')) {
      const p = String(patch.path);
      patch.path = require('path').isAbsolute(p) ? p : require('path').resolve(process.cwd(), p);
    }
    Object.assign(repo, patch);
    await repo.save();
    const safe = repo.toObject(); delete safe.gitSecret; res.apiOk(safe);
  });

  // Sync a single repository (git/http/local). Validates flows; if invalid and !force, returns impacted
  r.post('/plugin-repos/:id/sync', requireAdmin(), async (req, res) => {
    await ensureDefaultLocal();
    const repo = await PluginRepo.findById(req.params.id);
    if (!repo) return res.apiError(404, 'plugin_repo_not_found', 'Plugin repo not found');
    const defaultPath = path.resolve(__dirname, '../../plugins/local');
    const isBuiltin = repo.type === 'local' && path.resolve(repo.path || '') === defaultPath && !repo.companyId;
    // For local built-in: just reload registry
    // For git/http: here we would clone/pull to a cache dir; in this project, we simulate
    // Mark sync attempt
    repo.lastSyncAt = new Date(); repo.status = 'syncing'; await repo.save();
    // Add base dir when local
    if (repo.type === 'local' && repo.path) registry.addBaseDir(repo.path, { id: repo._id, name: repo.name, companyId: repo.companyId || null });
    // Reload plugins (imports manifest → providers/node-templates)
    const loaded = registry.reload();
    // Validate flows against current templates
    const Flow = require('../../db/models/flow.model');
    const Workspace = require('../../db/models/workspace.model');
    const NodeTemplate = require('../../db/models/node-template.model');
    const Notification = require('../../db/models/notification.model');
    const Run = require('../../db/models/run.model');
    const { validateFlowGraph } = require('../../utils/validate');
    const flows = await Flow.find({}).lean();
    const impacted = [];
    for (const f of flows){
      const ws = await Workspace.findById(f.workspaceId).lean();
      if (!ws) continue;
      const loaders = {
        getTemplateByKey: async (key) => NodeTemplate.findOne({ key }).lean(),
        isTemplateAllowed: async (_key) => true,
      };
      const v = await validateFlowGraph(f.graph || f, { strict: true, loaders });
      if (!v.ok) impacted.push({ flowId: String(f._id), workspaceId: String(ws._id), companyId: String(ws.companyId), name: f.name, errors: v.errors });
    }
    const force = !!(req.body && req.body.force);
    if (impacted.length && !force){
      repo.status = 'sync_failed'; await repo.save();
      return res.apiError(400, 'plugin_repo_update_invalid', 'Some flows are invalid with updated plugins', { impacted, loaded });
    }
    // If forced and impacted: disable flows, cancel running runs, notify
    if (impacted.length){
      for (const it of impacted){
        try {
          const flow = await Flow.findById(it.flowId);
          if (flow) { flow.enabled = false; await flow.save(); }
          // Cancel running runs
          await Run.updateMany({ flowId: flow._id, status: 'running' }, { $set: { status: 'cancelled', finishedAt: new Date() } });
          // Create notification
          await Notification.create({ companyId: it.companyId, workspaceId: it.workspaceId, entityType: 'flow', entityId: it.flowId, severity: 'critical', code: 'plugin_repo_update_invalid', message: `Flow disabled due to plugin repo update`, details: { errors: it.errors }, link: `/flows/${it.flowId}/editor` });
        } catch {}
      }
    }
    repo.status = 'synced'; await repo.save();
    res.apiOk({ synced: true, loaded, impacted });
  });

  r.post('/plugin-repos/reload', requireAdmin(), async (_req, res) => {
    await ensureDefaultLocal();
    // Add base dirs for enabled local repos then reload
    const repos = await PluginRepo.find({ enabled: true, type: 'local' });
    for (const rp of repos){ if (rp.path) registry.addBaseDir(rp.path, { id: rp._id, name: rp.name, companyId: rp.companyId || null }); }
    const loaded = registry.reload();
    res.apiOk({ loaded, repos: repos.map(r => r.path) });
  });

  // Summary of items imported from a repo (providers, node templates)
  r.get('/plugin-repos/:id/summary', async (req, res) => {
    const id = req.params.id;
    const Provider = require('../../db/models/provider.model');
    const NodeTemplate = require('../../db/models/node-template.model');
    const providers = await Provider.find({ repoId: id }).lean();
    const nodeTemplates = await NodeTemplate.find({ repoId: id }).lean();
    res.apiOk({ providers, nodeTemplates });
  });

  // Optional delete: forbid deletion of built-in local repo
  r.delete('/plugin-repos/:id', requireAdmin(), async (req, res) => {
    const repo = await PluginRepo.findById(req.params.id);
    if (!repo) return res.apiError(404, 'plugin_repo_not_found', 'Plugin repo not found');
    const defaultPath = path.resolve(__dirname, '../../plugins/local');
    const isBuiltin = repo.type === 'local' && path.resolve(repo.path || '') === defaultPath && !repo.companyId;
    if (isBuiltin) return res.apiError(400, 'forbidden', 'Cannot delete built-in local repository');
    await repo.deleteOne();
    res.apiOk({ deleted: true, id: req.params.id });
  });

  return r;
}
