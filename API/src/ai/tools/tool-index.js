// ToolIndex — in-memory index of all NodeTemplates + Providers for fast search
// Rebuilt at startup and on template/provider changes
// 100% DYNAMIC — all provider aliases come from the DB, nothing hardcoded

const NodeTemplate = require('../../db/models/node-template.model');
const Provider = require('../../db/models/provider.model');

// ── French↔English synonym pairs for search expansion (language mapping only) ──
const SYNONYMS = {
  envoyer: ['send', 'envoi', 'envoy'],
  send: ['envoyer', 'envoi'],
  recevoir: ['receive', 'reception', 'nouvel'],
  receive: ['recevoir', 'reception'],
  reception: ['recevoir', 'receive', 'nouvel'],
  lister: ['list', 'liste', 'lire'],
  list: ['lister', 'liste'],
  liste: ['lister', 'list'],
  creer: ['create', 'creation', 'nouveau', 'ajouter'],
  create: ['creer', 'creation', 'nouveau'],
  supprimer: ['delete', 'remove', 'suppression', 'retirer'],
  delete: ['supprimer', 'remove', 'suppression'],
  modifier: ['update', 'edit', 'modification', 'mettre'],
  update: ['modifier', 'edit', 'modification'],
  chercher: ['search', 'find', 'recherche', 'trouver'],
  search: ['chercher', 'recherche', 'trouver'],
  telecharger: ['download', 'upload', 'telechargement'],
  download: ['telecharger'],
  upload: ['telecharger', 'envoyer'],
  message: ['msg', 'notification', 'chat'],
  fichier: ['file', 'document'],
  file: ['fichier', 'document'],
  classifier: ['classify', 'classification', 'categoriser', 'trier'],
  classify: ['classifier', 'classification'],
  extraire: ['extract', 'extraction'],
  extract: ['extraire', 'extraction'],
  analyser: ['analyze', 'analyse', 'analysis', 'classifier', 'classify'],
  analyze: ['analyser', 'analyse', 'classifier', 'classify'],
  generer: ['generate', 'generation'],
  generate: ['generer', 'generation'],
  completion: ['chat', 'generate', 'generer'],
  trigger: ['declencheur', 'evenement', 'event', 'nouvel'],
  declencheur: ['trigger', 'event', 'evenement'],
  webhook: ['endpoint', 'http'],
  cron: ['planifie', 'schedule', 'recurrence'],
  contact: ['personne', 'client', 'lead'],
  projet: ['project'],
  project: ['projet'],
  tache: ['task', 'issue', 'ticket'],
  task: ['tache', 'issue'],
};

/** Normalize text: lowercase, strip accents, strip hyphens/apostrophes */
function norm(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-''_]/g, ' ');
}

class ToolIndex {
  constructor() {
    this.entries = [];
    this.byProvider = new Map();   // providerKey → [entries]
    this.byKey = new Map();        // templateKey → entry
    this._built = false;

    // Dynamic provider resolution maps (built from DB)
    this._providerKeysLower = new Map();    // lowercase providerKey → real providerKey
    this._providerNameToKeys = new Map();   // normalized name/title → [providerKeys]
    this._providerTagToKeys = new Map();    // normalized tag → [providerKeys]
    this._providerMultiWord = [];           // [{ phrase, keys }] for multi-word matches
  }

  async rebuild() {
    // ── 1. Load ALL providers from DB ──
    const providers = await Provider.find(
      { enabled: { $ne: false } },
      'key name title tags categories'
    ).lean();

    // ── 2. Build dynamic provider alias maps ──
    this._providerKeysLower.clear();
    this._providerNameToKeys.clear();
    this._providerTagToKeys.clear();
    this._providerMultiWord = [];

    for (const p of providers) {
      const pk = p.key;
      // lowercase key → real key
      this._providerKeysLower.set(pk.toLowerCase(), pk);

      // name → providerKey(s)
      const names = [p.name, p.title].filter(Boolean);
      for (const n of names) {
        const nNorm = norm(n);
        // Single word and multi-word tokens
        if (!this._providerNameToKeys.has(nNorm)) this._providerNameToKeys.set(nNorm, []);
        if (!this._providerNameToKeys.get(nNorm).includes(pk)) this._providerNameToKeys.get(nNorm).push(pk);

        // Also each individual word of the name (e.g. "Google Drive" → "google", "drive")
        const words = nNorm.split(/\s+/).filter(Boolean);
        for (const w of words) {
          if (w.length < 3) continue; // skip tiny words
          if (!this._providerNameToKeys.has(w)) this._providerNameToKeys.set(w, []);
          if (!this._providerNameToKeys.get(w).includes(pk)) this._providerNameToKeys.get(w).push(pk);
        }

        // Multi-word names for phrase matching (e.g. "google drive", "microsoft teams")
        if (words.length > 1) {
          this._providerMultiWord.push({ phrase: nNorm, keys: [pk] });
        }
      }

      // tags → providerKey(s)
      for (const tag of (p.tags || [])) {
        const tNorm = norm(tag);
        if (!this._providerTagToKeys.has(tNorm)) this._providerTagToKeys.set(tNorm, []);
        if (!this._providerTagToKeys.get(tNorm).includes(pk)) this._providerTagToKeys.get(tNorm).push(pk);
      }

      // categories → providerKey(s)
      for (const cat of (p.categories || [])) {
        const cNorm = norm(cat);
        if (!this._providerTagToKeys.has(cNorm)) this._providerTagToKeys.set(cNorm, []);
        if (!this._providerTagToKeys.get(cNorm).includes(pk)) this._providerTagToKeys.get(cNorm).push(pk);
      }
    }

    // ── 3. Load ALL templates ──
    const templates = await NodeTemplate.find(
      { enabled: { $ne: false } },
      'key name title description providerKey category group tags type'
    ).lean();

    this.entries = templates.map(t => {
      const name = t.title || t.name || '';
      const desc = t.description || '';
      const key = t.key || '';
      return {
        key,
        name,
        description: desc,
        provider: t.providerKey || '',
        category: t.category || t.group || '',
        tags: t.tags || [],
        type: t.type,
        // Pre-normalized fields for search
        _name: norm(name),
        _desc: norm(desc),
        _key: key.toLowerCase(),
        _keyParts: key.toLowerCase().replace(/_/g, ' '),
        _tags: norm((t.tags || []).join(' ')),
        _all: norm(`${name} ${desc} ${key.replace(/_/g, ' ')} ${(t.tags || []).join(' ')}`),
      };
    });

    // ── 4. Build template indexes ──
    this.byProvider.clear();
    this.byKey.clear();
    for (const e of this.entries) {
      if (e.provider) {
        if (!this.byProvider.has(e.provider)) this.byProvider.set(e.provider, []);
        this.byProvider.get(e.provider).push(e);
        // Also register providerKey from templates (may not be in Provider collection)
        if (!this._providerKeysLower.has(e.provider.toLowerCase())) {
          this._providerKeysLower.set(e.provider.toLowerCase(), e.provider);
        }
      }
      this.byKey.set(e.key, e);
    }

    this._built = true;
    console.log(`[tool-index] rebuilt: ${this.entries.length} templates, ${this.byProvider.size} providers, ${providers.length} provider records`);
  }

  async ensureBuilt() {
    if (!this._built) await this.rebuild();
  }

  /**
   * Resolve provider string to actual providerKeys — fully dynamic from DB.
   * Tries in order: exact key, case-insensitive key, provider name/title, tags, substring.
   */
  _resolveProvider(input) {
    const low = norm(input);

    // 1. Direct match on providerKey
    if (this.byProvider.has(input)) return [input];

    // 2. Case-insensitive providerKey match
    if (this._providerKeysLower.has(low)) {
      const real = this._providerKeysLower.get(low);
      if (this.byProvider.has(real)) return [real];
    }

    // 3. Match by provider name/title (from DB)
    const nameKeys = this._providerNameToKeys.get(low);
    if (nameKeys?.length) {
      const valid = nameKeys.filter(k => this.byProvider.has(k));
      if (valid.length) return valid;
    }

    // 4. Match by provider tags/categories (from DB)
    const tagKeys = this._providerTagToKeys.get(low);
    if (tagKeys?.length) {
      const valid = tagKeys.filter(k => this.byProvider.has(k));
      if (valid.length) return valid;
    }

    // 5. Substring match on providerKey: "nextcloud" matches "nextcloudFiles", etc.
    const matches = [...this.byProvider.keys()].filter(k =>
      k.toLowerCase().includes(low) || low.includes(k.toLowerCase())
    );
    if (matches.length) return matches;

    return [];
  }

  /**
   * Auto-detect provider from query tokens, return { providerKeys, remaining }.
   * Tries multi-word phrases first, then single tokens.
   */
  _extractProviderFromQuery(query) {
    const qNorm = norm(query);

    // 1. Try multi-word provider names first (e.g., "google drive", "microsoft teams")
    for (const { phrase, keys } of this._providerMultiWord) {
      if (qNorm.includes(phrase)) {
        const remaining = qNorm.replace(phrase, '').trim();
        const resolved = keys.filter(k => this.byProvider.has(k));
        if (resolved.length) return { providerKeys: resolved, remaining };
      }
    }

    // 2. Also check multi-word in _providerNameToKeys (names with spaces)
    for (const [name, keys] of this._providerNameToKeys) {
      if (name.includes(' ') && qNorm.includes(name)) {
        const remaining = qNorm.replace(name, '').trim();
        const resolved = keys.filter(k => this.byProvider.has(k));
        if (resolved.length) return { providerKeys: resolved, remaining };
      }
    }

    // 3. Try single-word tokens
    const tokens = qNorm.split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      const resolved = this._resolveProvider(token);
      if (resolved.length) {
        const remaining = tokens.filter(t => t !== token).join(' ');
        return { providerKeys: resolved, remaining };
      }
    }

    return { providerKeys: [], remaining: query };
  }

  /** Expand tokens with synonyms */
  _expandTokens(tokens) {
    const expanded = new Set(tokens);
    for (const t of tokens) {
      // Basic French plural stemming
      if (t.endsWith('es') && t.length > 3) expanded.add(t.slice(0, -2));
      if (t.endsWith('s') && t.length > 2) expanded.add(t.slice(0, -1));
      // Synonym expansion
      const syns = SYNONYMS[t];
      if (syns) for (const s of syns) expanded.add(s);
    }
    return [...expanded];
  }

  search(query, { provider, category, type, limit = 20 } = {}) {
    let candidates = this.entries;

    // ── Provider filter ──
    let providerKeys = [];
    if (provider) {
      providerKeys = this._resolveProvider(provider);
    }

    // ── Auto-detect provider from query ──
    let textQuery = query || '';
    if (!providerKeys.length && textQuery) {
      const detected = this._extractProviderFromQuery(textQuery);
      if (detected.providerKeys.length) {
        providerKeys = detected.providerKeys;
        textQuery = detected.remaining;
      }
    }

    // Apply provider filter
    if (providerKeys.length) {
      candidates = providerKeys.flatMap(k => this.byProvider.get(k) || []);
      // Deduplicate
      const seen = new Set();
      candidates = candidates.filter(e => {
        if (seen.has(e.key)) return false;
        seen.add(e.key);
        return true;
      });
    }

    // ── Category filter ──
    if (category) {
      const cat = category.toLowerCase();
      candidates = candidates.filter(e => (e.category || '').toLowerCase().includes(cat));
    }

    // ── Type filter ──
    if (type) {
      candidates = candidates.filter(e => e.type === type);
    }

    // ── Text search with synonym expansion ──
    if (textQuery) {
      const q = norm(textQuery);
      const rawTokens = q.split(/\s+/).filter(Boolean);
      const tokenArr = this._expandTokens(rawTokens);

      const scored = candidates.map(e => {
        let score = 0;
        for (const token of tokenArr) {
          if (e._name.includes(token)) score += 3;
          if (e._key.includes(token)) score += 2;
          if (e._keyParts.includes(token)) score += 2;
          if (e._desc.includes(token)) score += 1;
          if (e._tags.includes(token)) score += 1;
        }
        return { entry: e, score };
      }).filter(r => r.score > 0);

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit).map(r => this._cleanEntry(r.entry));
    }

    // No text query — return all candidates (e.g., provider-only search)
    return candidates.slice(0, limit).map(e => this._cleanEntry(e));
  }

  _cleanEntry(e) {
    return {
      key: e.key,
      name: e.name,
      description: e.description,
      provider: e.provider,
      category: e.category,
      tags: e.tags,
      type: e.type,
    };
  }

  get(key) {
    return this.byKey.get(key) || null;
  }

  /** List all known provider keys that have templates */
  listProviders() {
    return [...this.byProvider.keys()];
  }
}

// Singleton
const toolIndex = new ToolIndex();

module.exports = { toolIndex, ToolIndex };
