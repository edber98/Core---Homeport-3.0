// Routes /ai/threads/:threadId/knowledge/* — données structurées key/value liées au thread.
//
// Pattern : c'est une mémoire structurée propre au thread (différent de la mémoire
// user globale et de la mémoire projet du workspace). Permet à l'IA et à l'user
// d'enregistrer des décisions, paramètres, faits importants à propos d'un projet.
//
// 3 sources : 'manual' (user UI), 'extracted' (importé CSV/JSON), 'ai' (extrait
// automatiquement par le subagent memory_extractor). Les entries 'ai' ont status
// 'pending' jusqu'à approbation user → permet un mode "memory review".
//
//   GET     /ai/threads/:id/knowledge                           liste (filtre ?status=)
//   GET     /ai/threads/:id/knowledge/pending-count             badge UI
//   POST    /ai/threads/:id/knowledge/entries/:eid/approve      pending → approved
//   POST    /ai/threads/:id/knowledge/entries/:eid/reject       pending → rejected
//   PUT     /ai/threads/:id/knowledge                           replace all
//   POST    /ai/threads/:id/knowledge/entries                   add single
//   POST    /ai/threads/:id/knowledge/import                    bulk CSV/JSON
//   GET     /ai/threads/:id/knowledge/export                    download JSON/CSV
//   PATCH   /ai/threads/:id/knowledge/entries/:eid              update single
//   DELETE  /ai/threads/:id/knowledge/entries/:eid              remove single

const AiProjectKnowledge = require('../../../db/models/ai-project-knowledge.model');
const { requireThreadAccess } = require('../../../ai/access/thread-access');

const KNOWLEDGE_TYPES = ['text', 'number', 'date', 'url', 'email', 'file', 'list', 'boolean', 'json'];
const KEY_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;
const MAX_VALUE_BYTES = 10 * 1024; // 10 KB

function _valueSize(v) {
  try { return Buffer.byteLength(typeof v === 'string' ? v : JSON.stringify(v ?? ''), 'utf8'); }
  catch { return 0; }
}

function _validateEntry(entry) {
  if (!entry || typeof entry !== 'object') return 'entry required';
  const key = typeof entry.key === 'string' ? entry.key.trim() : '';
  if (!key) return 'key required';
  if (!KEY_REGEX.test(key)) return `invalid key "${key}" (alphanumeric + . _ - only, <= 100 chars)`;
  if (entry.type && !KNOWLEDGE_TYPES.includes(entry.type)) return `invalid type "${entry.type}"`;
  if (entry.description && typeof entry.description === 'string' && entry.description.length > 500) {
    return 'description too long (max 500)';
  }
  if (_valueSize(entry.value) > MAX_VALUE_BYTES) return 'value too large (max 10 KB)';
  if (entry.tags && !Array.isArray(entry.tags)) return 'tags must be array';
  if (Array.isArray(entry.tags) && entry.tags.some(t => typeof t !== 'string' || t.length > 40)) {
    return 'invalid tag (string, max 40 chars)';
  }
  return null;
}

function _sanitizeEntry(entry, userId) {
  return {
    key: String(entry.key).trim(),
    value: entry.value,
    type: KNOWLEDGE_TYPES.includes(entry.type) ? entry.type : 'text',
    description: entry.description ? String(entry.description).slice(0, 500) : '',
    source: ['manual', 'extracted', 'ai'].includes(entry.source) ? entry.source : 'manual',
    pinned: !!entry.pinned,
    tags: Array.isArray(entry.tags) ? entry.tags.filter(t => typeof t === 'string').map(t => t.slice(0, 40)) : [],
    // Les entries créées manuellement via ces routes sont toujours 'approved'.
    // Seul memory_extractor crée des 'pending' (via tool direct, pas via ces routes).
    status: ['pending', 'approved', 'rejected'].includes(entry.status) ? entry.status : 'approved',
    updatedAt: new Date(),
    updatedBy: userId || undefined,
  };
}

module.exports = function registerProjectKnowledgeRoutes(r) {
  // ── GET full doc (avec filtre ?status=pending|approved|rejected|all) ──
  r.get('/ai/threads/:threadId/knowledge', requireThreadAccess('view'), async (req, res) => {
    const doc = await AiProjectKnowledge.findOne({ threadId: req.aiThread._id }).lean();
    const base = doc || { threadId: req.aiThread._id, workspaceId: req.aiThread.workspaceId, entries: [] };
    const statusFilter = typeof req.query?.status === 'string' ? req.query.status : null;
    if (statusFilter && statusFilter !== 'all') {
      // Legacy : entries sans status traitées comme 'approved'
      const entries = (base.entries || []).filter(e => (e.status || 'approved') === statusFilter);
      return res.apiOk({ ...base, entries });
    }
    res.apiOk(base);
  });

  // ── GET pending-count (badge UI rapide, sans payload entries) ──────
  r.get('/ai/threads/:threadId/knowledge/pending-count', requireThreadAccess('view'), async (req, res) => {
    const doc = await AiProjectKnowledge.findOne({ threadId: req.aiThread._id }, 'entries.status').lean();
    const count = (doc?.entries || []).filter(e => e.status === 'pending').length;
    res.apiOk({ count });
  });

  // ── Approve (pending → approved, avec patch optionnel) ────────────
  r.post('/ai/threads/:threadId/knowledge/entries/:entryId/approve', requireThreadAccess('edit'), async (req, res) => {
    const doc = await AiProjectKnowledge.findOne({ threadId: req.aiThread._id });
    if (!doc) return res.apiError(404, 'knowledge_not_found', 'No knowledge doc');
    const entry = doc.entries.id(req.params.entryId);
    if (!entry) return res.apiError(404, 'entry_not_found', 'Entry not found');

    // Patch optionnel avant approbation (modifier la valeur avant d'approuver)
    const patch = req.body || {};
    for (const k of ['key', 'value', 'type', 'description', 'tags']) {
      if (k in patch) entry[k] = patch[k];
    }
    entry.status = 'approved';
    entry.reviewedAt = new Date();
    entry.reviewedBy = req.user.id;
    entry.updatedAt = new Date();
    entry.updatedBy = req.user.id;
    await doc.save();
    res.apiOk(entry);
  });

  // ── Reject (pending → rejected) ────────────────────────────────────
  r.post('/ai/threads/:threadId/knowledge/entries/:entryId/reject', requireThreadAccess('edit'), async (req, res) => {
    const doc = await AiProjectKnowledge.findOne({ threadId: req.aiThread._id });
    if (!doc) return res.apiError(404, 'knowledge_not_found', 'No knowledge doc');
    const entry = doc.entries.id(req.params.entryId);
    if (!entry) return res.apiError(404, 'entry_not_found', 'Entry not found');
    entry.status = 'rejected';
    entry.reviewedAt = new Date();
    entry.reviewedBy = req.user.id;
    await doc.save();
    res.apiOk(entry);
  });

  // ── PUT — replace all entries ──────────────────────────────────────
  r.put('/ai/threads/:threadId/knowledge', requireThreadAccess('edit'), async (req, res) => {
    const { entries } = req.body || {};
    if (!Array.isArray(entries)) return res.apiError(400, 'invalid_payload', 'entries[] required');
    const seen = new Set();
    for (const e of entries) {
      const err = _validateEntry(e);
      if (err) return res.apiError(400, 'invalid_entry', err);
      if (seen.has(e.key)) return res.apiError(400, 'duplicate_key', `duplicate key "${e.key}"`);
      seen.add(e.key);
    }
    const sanitized = entries.map(e => _sanitizeEntry(e, req.user.id));
    const doc = await AiProjectKnowledge.findOneAndUpdate(
      { threadId: req.aiThread._id },
      { $set: { entries: sanitized, workspaceId: req.aiThread.workspaceId }, $setOnInsert: { threadId: req.aiThread._id } },
      { upsert: true, new: true }
    );
    res.apiOk(doc);
  });

  // ── POST — add single entry ────────────────────────────────────────
  r.post('/ai/threads/:threadId/knowledge/entries', requireThreadAccess('edit'), async (req, res) => {
    const entry = req.body || {};
    const err = _validateEntry(entry);
    if (err) return res.apiError(400, 'invalid_entry', err);
    const existing = await AiProjectKnowledge.findOne(
      { threadId: req.aiThread._id, 'entries.key': entry.key },
      { 'entries.$': 1 }
    ).lean();
    if (existing) return res.apiError(409, 'duplicate_key', `key "${entry.key}" already exists`);
    const sanitized = _sanitizeEntry(entry, req.user.id);
    const doc = await AiProjectKnowledge.findOneAndUpdate(
      { threadId: req.aiThread._id },
      { $push: { entries: sanitized }, $setOnInsert: { workspaceId: req.aiThread.workspaceId, threadId: req.aiThread._id } },
      { upsert: true, new: true }
    );
    res.apiOk(doc.entries[doc.entries.length - 1]);
  });

  // ── POST /import — bulk CSV/JSON (mode merge ou replace) ──────────
  // Doit être déclarée AVANT les routes :entryId pour éviter le matching.
  r.post('/ai/threads/:threadId/knowledge/import', requireThreadAccess('edit'), async (req, res) => {
    const { format, data, mode } = req.body || {};
    if (!['csv', 'json'].includes(format)) return res.apiError(400, 'invalid_format', 'format must be csv or json');
    if (typeof data !== 'string' && typeof data !== 'object') return res.apiError(400, 'invalid_data', 'data required');

    let imported = [];
    try {
      if (format === 'json') {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.entries) ? parsed.entries : null);
        if (!arr) return res.apiError(400, 'invalid_json', 'JSON must be an array or {entries:[]}');
        imported = arr;
      } else {
        // CSV simple parser : 1ère ligne = headers, séparateur virgule, naïf (pas d'échappement commas)
        const text = String(data).trim();
        if (!text) return res.apiError(400, 'empty_csv', 'CSV empty');
        const lines = text.split(/\r?\n/);
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const keyIdx = headers.indexOf('key');
        const valueIdx = headers.indexOf('value');
        if (keyIdx < 0 || valueIdx < 0) return res.apiError(400, 'csv_missing_headers', 'CSV must have key,value columns');
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          if (!row.trim()) continue;
          const cells = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          imported.push({
            key: cells[keyIdx],
            value: cells[valueIdx],
            type: cells[headers.indexOf('type')] || 'text',
            description: cells[headers.indexOf('description')] || '',
            tags: (cells[headers.indexOf('tags')] || '').split('|').filter(Boolean),
          });
        }
      }
    } catch (e) {
      return res.apiError(400, 'parse_error', e?.message || 'Failed to parse import data');
    }

    const errors = [];
    const validated = [];
    for (const e of imported) {
      const err = _validateEntry(e);
      if (err) { errors.push({ key: e?.key, error: err }); continue; }
      validated.push(_sanitizeEntry(e, req.user.id));
    }

    // Merge ou replace selon le mode
    const existingDoc = await AiProjectKnowledge.findOne({ threadId: req.aiThread._id });
    let entries = (mode === 'replace' || !existingDoc) ? [] : [...existingDoc.entries];
    for (const e of validated) {
      const idx = entries.findIndex(x => x.key === e.key);
      if (idx >= 0) entries[idx] = { ...(entries[idx].toObject?.() || entries[idx]), ...e };
      else entries.push(e);
    }

    const doc = await AiProjectKnowledge.findOneAndUpdate(
      { threadId: req.aiThread._id },
      { $set: { entries, workspaceId: req.aiThread.workspaceId }, $setOnInsert: { threadId: req.aiThread._id } },
      { upsert: true, new: true }
    );
    res.apiOk({ imported: validated.length, total: doc.entries.length, errors });
  });

  // ── GET /export — download JSON/CSV (AVANT :entryId) ──────────────
  r.get('/ai/threads/:threadId/knowledge/export', requireThreadAccess('view'), async (req, res) => {
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const doc = await AiProjectKnowledge.findOne({ threadId: req.aiThread._id }).lean();
    const entries = doc?.entries || [];

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="knowledge-${req.aiThread._id}.json"`);
      return res.send(JSON.stringify({ threadId: String(req.aiThread._id), entries }, null, 2));
    }
    // CSV
    const headers = ['key', 'value', 'type', 'description', 'pinned', 'tags'];
    const escape = (v) => {
      const s = v == null ? '' : (typeof v === 'string' ? v : JSON.stringify(v));
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [headers.join(',')];
    for (const e of entries) {
      rows.push([
        escape(e.key), escape(e.value), escape(e.type), escape(e.description),
        escape(e.pinned ? 'true' : 'false'), escape((e.tags || []).join('|')),
      ].join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="knowledge-${req.aiThread._id}.csv"`);
    res.send(rows.join('\n'));
  });

  // ── PATCH — update single entry ────────────────────────────────────
  r.patch('/ai/threads/:threadId/knowledge/entries/:entryId', requireThreadAccess('edit'), async (req, res) => {
    const patch = req.body || {};
    const doc = await AiProjectKnowledge.findOne({ threadId: req.aiThread._id });
    if (!doc) return res.apiError(404, 'knowledge_not_found', 'No knowledge doc');
    const entry = doc.entries.id(req.params.entryId);
    if (!entry) return res.apiError(404, 'entry_not_found', 'Entry not found');

    // Si la clé change, re-valide + check unique
    const merged = { ...entry.toObject(), ...patch };
    const err = _validateEntry(merged);
    if (err) return res.apiError(400, 'invalid_entry', err);

    if (patch.key && patch.key !== entry.key) {
      const dup = doc.entries.find(e => String(e._id) !== req.params.entryId && e.key === patch.key);
      if (dup) return res.apiError(409, 'duplicate_key', `key "${patch.key}" already exists`);
    }

    for (const k of ['key', 'value', 'type', 'description', 'pinned', 'tags', 'source', 'status']) {
      if (k in patch) {
        if (k === 'status' && !['pending', 'approved', 'rejected'].includes(patch.status)) continue;
        entry[k] = patch[k];
      }
    }
    entry.updatedAt = new Date();
    entry.updatedBy = req.user.id;
    await doc.save();
    res.apiOk(entry);
  });

  // ── DELETE — remove single entry ───────────────────────────────────
  r.delete('/ai/threads/:threadId/knowledge/entries/:entryId', requireThreadAccess('edit'), async (req, res) => {
    const upd = await AiProjectKnowledge.updateOne(
      { threadId: req.aiThread._id },
      { $pull: { entries: { _id: req.params.entryId } } }
    );
    if (!upd.modifiedCount) return res.apiError(404, 'entry_not_found', 'Entry not found');
    res.apiOk({ deleted: true });
  });
};
