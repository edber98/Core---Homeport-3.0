const { classifyWithAx } = require('../../_shared/ax-helpers');

module.exports = {
  async google_ai_classify(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const creds = (opts && opts.credentials) || {};
    const apiKey = creds.apiKey;
    if (!apiKey) throw new Error('Missing Google AI apiKey in credentials');
    const model = String(inputs.model || creds.defaultModel || 'gemini-2.0-flash');
    const system = String(inputs.system || '').trim();
    const text = String(inputs.text || '').trim();
    const categories = (node.model && node.model.context && node.model.context.categories) || [];
    if (!categories.length) throw new Error('Au moins une catégorie est requise');
    if (!text) throw new Error('Le texte à classifier est requis');

    log('Classification en cours...');
    const result = await classifyWithAx('google-gemini', apiKey, model, system, text, categories);
    return { ok: true, ...result };
  },
};
