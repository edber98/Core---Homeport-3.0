// Routes /ai/prompt-templates/* + /ai/user-skills/* — library réutilisable workspace.
//
// Pattern partagé : un user voit SES templates privés + tous les "shared" du workspace.
// Seul le createur peut modifier/supprimer le sien (créateur != admin → no override).
//
//   GET    /ai/prompt-templates              recherche (q, category, sort)
//   POST   /ai/prompt-templates              créer
//   PUT    /ai/prompt-templates/:id          MAJ (owner only)
//   DELETE /ai/prompt-templates/:id          supprimer (owner only)
//   POST   /ai/prompt-templates/:id/use      incrémente useCount + retourne prompt
//
//   GET    /ai/user-skills                   idem mais code-snippets
//   POST   /ai/user-skills                   créer
//   PUT    /ai/user-skills/:id               MAJ
//   DELETE /ai/user-skills/:id               supprimer
//   POST   /ai/user-skills/:id/fork          duplique un skill dans son espace
//   POST   /ai/user-skills/:id/use           incrémente useCount + retourne code

const AiPromptTemplate = require('../../../db/models/ai-prompt-template.model');
const AiUserSkill = require('../../../db/models/ai-user-skill.model');
const { ensureWorkspaceAccess } = require('./_shared');

function _buildSharedFilter(ws, user) {
  return {
    workspaceId: ws._id,
    companyId: user.companyId,
    $or: [{ shared: true }, { createdBy: user._id || user.id }],
  };
}

function _searchSpec(sort) {
  if (sort === 'recent') return { lastUsedAt: -1, updatedAt: -1 };
  if (sort === 'alpha') return { name: 1 };
  return { useCount: -1, updatedAt: -1 };
}

module.exports = function registerLibraryRoutes(r) {
  // ── Prompt templates ───────────────────────────────────────────────
  r.get('/ai/prompt-templates', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res); if (!ws) return;
    const q = (req.query.q || '').toString().trim();
    const filter = _buildSharedFilter(ws, req.user);
    if (req.query.category) filter.category = req.query.category;
    if (q) filter.$and = [{ $or: [
      { name: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') },
      { tags: new RegExp(q, 'i') },
    ] }];
    const list = await AiPromptTemplate.find(filter).sort(_searchSpec(req.query.sort)).limit(200).lean();
    res.apiOk(list);
  });

  r.post('/ai/prompt-templates', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res); if (!ws) return;
    const { name, description, prompt, category, tags, shared } = req.body || {};
    if (!name || !prompt) return res.apiError(400, 'missing_fields', 'name et prompt requis');
    const doc = await AiPromptTemplate.create({
      workspaceId: ws._id, companyId: req.user.companyId,
      createdBy: req.user._id || req.user.id,
      name: String(name).slice(0, 120),
      description: String(description || '').slice(0, 500),
      prompt: String(prompt).slice(0, 20_000),
      category: category || 'général',
      tags: Array.isArray(tags) ? tags.slice(0, 10).map(t => String(t).slice(0, 40)) : [],
      shared: shared !== false,
    });
    res.apiOk(doc);
  });

  r.put('/ai/prompt-templates/:id', async (req, res) => {
    const tpl = await AiPromptTemplate.findOne({ id: req.params.id, companyId: req.user.companyId });
    if (!tpl) return res.apiError(404, 'not_found', 'Template introuvable');
    if (String(tpl.createdBy) !== String(req.user._id || req.user.id)) {
      return res.apiError(403, 'not_owner', 'Seul le créateur peut modifier');
    }
    for (const k of ['name', 'description', 'prompt', 'category', 'tags', 'shared']) {
      if (req.body[k] !== undefined) tpl[k] = req.body[k];
    }
    await tpl.save();
    res.apiOk(tpl);
  });

  r.delete('/ai/prompt-templates/:id', async (req, res) => {
    const tpl = await AiPromptTemplate.findOne({ id: req.params.id, companyId: req.user.companyId });
    if (!tpl) return res.apiError(404, 'not_found', 'Template introuvable');
    if (String(tpl.createdBy) !== String(req.user._id || req.user.id)) {
      return res.apiError(403, 'not_owner', 'Seul le créateur peut supprimer');
    }
    await AiPromptTemplate.deleteOne({ _id: tpl._id });
    res.apiOk({ deleted: true });
  });

  r.post('/ai/prompt-templates/:id/use', async (req, res) => {
    const tpl = await AiPromptTemplate.findOneAndUpdate(
      { id: req.params.id, companyId: req.user.companyId },
      { $inc: { useCount: 1 }, $set: { lastUsedAt: new Date() } },
      { new: true }
    );
    if (!tpl) return res.apiError(404, 'not_found', 'Template introuvable');
    res.apiOk({ prompt: tpl.prompt, name: tpl.name });
  });

  // ── User skills (marketplace interne : code snippets partagés) ─────
  r.get('/ai/user-skills', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res); if (!ws) return;
    const q = (req.query.q || '').toString().trim();
    const filter = _buildSharedFilter(ws, req.user);
    if (req.query.language) filter.language = req.query.language;
    if (q) filter.$and = [{ $or: [
      { name: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') },
      { tags: new RegExp(q, 'i') },
    ] }];
    const sortSpec = req.query.sort === 'recent' ? { updatedAt: -1 }
      : req.query.sort === 'alpha' ? { name: 1 }
      : { useCount: -1, updatedAt: -1 };
    const list = await AiUserSkill.find(filter).sort(sortSpec).limit(200).lean();
    res.apiOk(list);
  });

  r.post('/ai/user-skills', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res); if (!ws) return;
    const { name, description, language, code, tags, shared } = req.body || {};
    if (!name || !code) return res.apiError(400, 'missing_fields', 'name et code requis');
    const doc = await AiUserSkill.create({
      workspaceId: ws._id, companyId: req.user.companyId,
      createdBy: req.user._id || req.user.id,
      name: String(name).slice(0, 120),
      description: String(description || '').slice(0, 500),
      language: language || 'python',
      code: String(code).slice(0, 50_000),
      tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
      shared: shared !== false,
    });
    res.apiOk(doc);
  });

  r.put('/ai/user-skills/:id', async (req, res) => {
    const sk = await AiUserSkill.findOne({ id: req.params.id, companyId: req.user.companyId });
    if (!sk) return res.apiError(404, 'not_found', 'Skill introuvable');
    if (String(sk.createdBy) !== String(req.user._id || req.user.id)) {
      return res.apiError(403, 'not_owner', 'Seul le créateur peut modifier');
    }
    for (const k of ['name', 'description', 'language', 'code', 'tags', 'shared']) {
      if (req.body[k] !== undefined) sk[k] = req.body[k];
    }
    await sk.save();
    res.apiOk(sk);
  });

  r.delete('/ai/user-skills/:id', async (req, res) => {
    const sk = await AiUserSkill.findOne({ id: req.params.id, companyId: req.user.companyId });
    if (!sk) return res.apiError(404, 'not_found', 'Skill introuvable');
    if (String(sk.createdBy) !== String(req.user._id || req.user.id)) {
      return res.apiError(403, 'not_owner', 'Seul le créateur peut supprimer');
    }
    await AiUserSkill.deleteOne({ _id: sk._id });
    res.apiOk({ deleted: true });
  });

  // Fork : duplique un skill existant dans son propre espace (privé par défaut)
  r.post('/ai/user-skills/:id/fork', async (req, res) => {
    const src = await AiUserSkill.findOne({ id: req.params.id, companyId: req.user.companyId });
    if (!src) return res.apiError(404, 'not_found', 'Skill introuvable');
    const fork = await AiUserSkill.create({
      workspaceId: src.workspaceId, companyId: src.companyId,
      createdBy: req.user._id || req.user.id,
      name: `${src.name} (fork)`,
      description: src.description,
      language: src.language,
      code: src.code,
      tags: src.tags,
      shared: false,
      forkedFrom: src.id,
    });
    await AiUserSkill.updateOne({ _id: src._id }, { $inc: { forkCount: 1 } });
    res.apiOk(fork);
  });

  r.post('/ai/user-skills/:id/use', async (req, res) => {
    const sk = await AiUserSkill.findOneAndUpdate(
      { id: req.params.id, companyId: req.user.companyId },
      { $inc: { useCount: 1 }, $set: { lastUsedAt: new Date() } },
      { new: true }
    );
    if (!sk) return res.apiError(404, 'not_found', 'Skill introuvable');
    res.apiOk({ code: sk.code, name: sk.name, language: sk.language });
  });
};
