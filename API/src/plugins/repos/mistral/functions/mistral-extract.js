const { extractWithAx, resolveImageInput } = require('../../_shared/ax-helpers');

module.exports = {
  async mistral_extract(node, msg, inputs, opts) {
    const creds = (opts && opts.credentials) || {};
    const apiKey = creds.apiKey;
    if (!apiKey) throw new Error('Missing Mistral apiKey in credentials');
    const model = String(inputs.model || creds.defaultModel || 'mistral-large-latest');
    const system = String(inputs.system || '').trim();
    const content = String(inputs.content || '').trim();
    const schema = inputs.extraction_schema || (node.model && node.model.context && node.model.context.extraction_schema) || [];
    if (!schema.length) throw new Error('Le schéma d\'extraction est requis');

    const img = inputs.image ? await resolveImageInput(inputs, opts) : null;
    if (!content && !img) throw new Error('Le contenu ou une image est requis');

    const result = await extractWithAx('mistral', apiKey, model, system, content, schema, img?.base64, img?.mimeType);
    return { ok: true, ...result };
  },
};
