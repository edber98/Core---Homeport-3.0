const { classifyWithAx } = require('../../_shared/ax-helpers');

module.exports = {
  async anthropic_classify(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const creds = (opts && opts.credentials) || {};
    const apiKey = creds.apiKey;
    if (!apiKey) return { ok: false, error: 'Clé API Anthropic manquante.' };
    const model = String(inputs.model || creds.defaultModel || 'claude-sonnet-4-5-20250929');
    const system = String(inputs.system || '').trim();
    const text = String(inputs.text || '').trim();
    const categories = Array.isArray(inputs.categories)
      ? inputs.categories
      : ((node.model && node.model.context && node.model.context.categories) || []);
    if (!categories.length) return { ok: false, error: 'Au moins une catégorie est requise.' };
    if (!text) return { ok: false, error: 'Le texte à classifier est requis.' };

    log('Classification en cours...');
    try {
      const result = await classifyWithAx('anthropic', apiKey, model, system, text, categories);
      return { ok: true, ...result };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
};
