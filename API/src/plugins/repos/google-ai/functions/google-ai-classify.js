const { classifyWithAx } = require('../../_shared/ax-helpers');

module.exports = {
  async google_ai_classify(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const creds = (opts && opts.credentials) || {};
    const apiKey = creds.apiKey;
    if (!apiKey) return { ok: false, error: 'Clé API Google AI manquante.' };
    const model = String(inputs.model || creds.defaultModel || 'gemini-2.0-flash');
    const system = String(inputs.system || '').trim();
    const text = String(inputs.text || '').trim();
    const categories = Array.isArray(inputs.categories)
      ? inputs.categories
      : ((node.model && node.model.context && node.model.context.categories) || []);
    if (!categories.length) return { ok: false, error: 'Au moins une catégorie est requise.' };
    if (!text) return { ok: false, error: 'Le texte à classifier est requis.' };

    log('Classification en cours...');
    try {
      const result = await classifyWithAx('google-gemini', apiKey, model, system, text, categories);
      return { ok: true, ...result };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
};
