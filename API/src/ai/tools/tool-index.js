// ToolIndex — in-memory index of all NodeTemplates for fast search
// Rebuilt at startup and on template changes

const NodeTemplate = require('../../db/models/node-template.model');

class ToolIndex {
  constructor() {
    this.entries = [];
    this.byProvider = new Map();
    this.byKey = new Map();
    this._built = false;
  }

  async rebuild() {
    const templates = await NodeTemplate.find(
      { enabled: { $ne: false } },
      'key name title description providerKey category group tags type'
    ).lean();

    this.entries = templates.map(t => ({
      key: t.key,
      name: t.title || t.name,
      description: t.description || '',
      provider: t.providerKey || '',
      category: t.category || t.group || '',
      tags: t.tags || [],
      type: t.type,
    }));

    this.byProvider.clear();
    this.byKey.clear();
    for (const e of this.entries) {
      if (e.provider) {
        if (!this.byProvider.has(e.provider)) this.byProvider.set(e.provider, []);
        this.byProvider.get(e.provider).push(e);
      }
      this.byKey.set(e.key, e);
    }
    this._built = true;
    console.log(`[tool-index] rebuilt: ${this.entries.length} templates indexed`);
  }

  async ensureBuilt() {
    if (!this._built) await this.rebuild();
  }

  search(query, { provider, category, type, limit = 20 } = {}) {
    let candidates = this.entries;

    // Filter by provider (substring match, case-insensitive)
    if (provider) {
      const prov = provider.toLowerCase();
      // Try exact match first
      if (this.byProvider.has(provider)) {
        candidates = this.byProvider.get(provider);
      } else {
        // Substring match: "nextcloud" matches "nextcloudFiles", "nextcloudTalk", etc.
        const matchingKeys = [...this.byProvider.keys()].filter(k => k.toLowerCase().includes(prov) || prov.includes(k.toLowerCase()));
        candidates = matchingKeys.flatMap(k => this.byProvider.get(k) || []);
      }
    }

    // Filter by category
    if (category) {
      const cat = category.toLowerCase();
      candidates = candidates.filter(e => (e.category || '').toLowerCase().includes(cat));
    }

    // Filter by type
    if (type) {
      candidates = candidates.filter(e => e.type === type);
    }

    // Text search (handles plurals, partial matches, key segments)
    if (query) {
      const q = query.toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);
      // Also add stemmed tokens (remove trailing s/es for basic plural handling)
      const allTokens = new Set(tokens);
      for (const t of tokens) {
        if (t.endsWith('es') && t.length > 3) allTokens.add(t.slice(0, -2));
        if (t.endsWith('s') && t.length > 2) allTokens.add(t.slice(0, -1));
      }
      const tokenArr = [...allTokens];

      const scored = candidates.map(e => {
        let score = 0;
        const name = (e.name || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const key = (e.key || '').toLowerCase();
        const keyParts = key.replace(/_/g, ' '); // nc_file_list → nc file list
        const tags = (e.tags || []).join(' ').toLowerCase();

        for (const token of tokenArr) {
          if (name.includes(token)) score += 3;
          if (key.includes(token)) score += 2;
          if (keyParts.includes(token)) score += 2;
          if (desc.includes(token)) score += 1;
          if (tags.includes(token)) score += 1;
        }
        return { ...e, score };
      }).filter(e => e.score > 0);

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit).map(({ score, ...rest }) => rest);
    }

    return candidates.slice(0, limit);
  }

  get(key) {
    return this.byKey.get(key) || null;
  }
}

// Singleton
const toolIndex = new ToolIndex();

module.exports = { toolIndex, ToolIndex };
