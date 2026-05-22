// Routes /ai/context/* + /ai/project-memory/* — gestion des mémoires & contextes AI.
//
//   GET  /ai/context                          contexte buildé complet (pour debug/UI)
//   PUT  /ai/context/company                  MAJ contexte entreprise (admin)
//   PUT  /ai/context/workspace                MAJ contexte workspace
//   PUT  /ai/context/user                     MAJ mémoire user (merge key-by-key, null=delete)
//   GET  /ai/context/providers                providers du workspace (avec credentials)
//   GET  /ai/project-memory/:type/:id         mémoire projet (flow/form)
//   PUT  /ai/project-memory/:type/:id         MAJ projet memory (merge, null=delete)
//
// Pattern important : pour user memory et project memory, on fait un MERGE clé-par-clé,
// pas un replace complet du dict. null en valeur = $unset cette clé.

const AiCompanyContext = require('../../../db/models/ai-company-context.model');
const AiWorkspaceContext = require('../../../db/models/ai-workspace-context.model');
const AiUserContext = require('../../../db/models/ai-user-context.model');
const AiProjectMemory = require('../../../db/models/ai-project-memory.model');
const Credential = require('../../../db/models/credential.model');
const Provider = require('../../../db/models/provider.model');
const { buildContext } = require('../../../ai/context/context-builder');
const { ensureWorkspaceAccess } = require('./_shared');

/**
 * Construit $set + $unset à partir d'un dict avec null = delete.
 * Préfixe les clés (ex: 'memory.x' au lieu de 'x') pour cibler un sous-champ.
 */
function buildMergeOps(dict, prefix) {
  const set = {};
  const unset = {};
  for (const [k, v] of Object.entries(dict || {})) {
    if (v === null) unset[`${prefix}.${k}`] = '';
    else set[`${prefix}.${k}`] = v;
  }
  return { set, unset };
}

module.exports = function registerContextRoutes(r) {
  // ── Build context complet ──────────────────────────────────────────
  r.get('/ai/context', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const context = await buildContext({ companyId: ws.companyId, workspaceId: ws._id, userId: req.user.id });
    res.apiOk(context);
  });

  // ── Company context ────────────────────────────────────────────────
  r.put('/ai/context/company', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const { description, industry, services, systemPrompt, preferences } = req.body || {};
    const update = {};
    if (description !== undefined) update.description = description;
    if (industry !== undefined) update.industry = industry;
    if (services !== undefined) update.services = services;
    if (systemPrompt !== undefined) update.systemPrompt = systemPrompt;
    if (preferences !== undefined) update.preferences = preferences;
    const doc = await AiCompanyContext.findOneAndUpdate(
      { companyId: ws.companyId },
      { $set: update, $setOnInsert: { companyId: ws.companyId } },
      { upsert: true, new: true }
    );
    res.apiOk(doc);
  });

  // ── Workspace context ──────────────────────────────────────────────
  r.put('/ai/context/workspace', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const { description, customInstructions } = req.body || {};
    const update = {};
    if (description !== undefined) update.description = description;
    if (customInstructions !== undefined) update.customInstructions = customInstructions;
    const doc = await AiWorkspaceContext.findOneAndUpdate(
      { workspaceId: ws._id },
      { $set: update, $setOnInsert: { companyId: ws.companyId, workspaceId: ws._id } },
      { upsert: true, new: true }
    );
    res.apiOk(doc);
  });

  // ── User context / memory (merge, null=delete) ─────────────────────
  r.put('/ai/context/user', async (req, res) => {
    const { preferences, memory } = req.body || {};
    const set = {};
    const unset = {};

    if (preferences !== undefined) {
      const prefOps = buildMergeOps(preferences, 'preferences');
      Object.assign(set, prefOps.set);
      Object.assign(unset, prefOps.unset);
    }
    if (memory !== undefined) {
      const memOps = buildMergeOps(memory, 'memory');
      Object.assign(set, memOps.set);
      Object.assign(unset, memOps.unset);
    }

    const ops = {};
    if (Object.keys(set).length) ops.$set = set;
    if (Object.keys(unset).length) ops.$unset = unset;
    if (!ops.$set) ops.$set = {};
    ops.$setOnInsert = { companyId: req.user.companyId, userId: req.user.id };

    const doc = await AiUserContext.findOneAndUpdate(
      { userId: req.user.id },
      ops,
      { upsert: true, new: true }
    );
    res.apiOk(doc);
  });

  // ── Project memory (per flow/form) ─────────────────────────────────
  r.get('/ai/project-memory/:elementType/:elementId', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const doc = await AiProjectMemory.findOne({
      workspaceId: ws._id,
      elementType: req.params.elementType,
      elementId: req.params.elementId,
    }).lean();
    res.apiOk(doc?.memory || {});
  });

  r.put('/ai/project-memory/:elementType/:elementId', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const { memory } = req.body || {};
    if (!memory) return res.apiError(400, 'missing_memory', 'memory object required');
    const memOps = buildMergeOps(memory, 'memory');
    const ops = {};
    if (Object.keys(memOps.set).length) ops.$set = memOps.set;
    if (Object.keys(memOps.unset).length) ops.$unset = memOps.unset;
    if (!ops.$set) ops.$set = {};
    ops.$setOnInsert = {
      workspaceId: ws._id,
      elementType: req.params.elementType,
      elementId: req.params.elementId,
    };
    const doc = await AiProjectMemory.findOneAndUpdate(
      { workspaceId: ws._id, elementType: req.params.elementType, elementId: req.params.elementId },
      ops,
      { upsert: true, new: true }
    );
    res.apiOk(doc?.memory || {});
  });

  // ── Available providers (names only, no secrets) ───────────────────
  r.get('/ai/context/providers', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const credentials = await Credential.find({ workspaceId: ws._id }, 'name providerKey').lean();
    const providerKeys = [...new Set(credentials.map(c => c.providerKey))];
    const providers = await Provider.find({ key: { $in: providerKeys } }, 'key name title iconUrl').lean();
    res.apiOk(providers.map(p => ({
      key: p.key,
      name: p.title || p.name,
      icon: p.iconUrl || null,
      credentials: credentials.filter(c => c.providerKey === p.key).map(c => ({ name: c.name })),
    })));
  });
};
