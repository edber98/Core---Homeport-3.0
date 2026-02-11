const { extractWithAx, resolveImageInput } = require('../../_shared/ax-helpers');

module.exports = {
  async google_ai_extract(node, msg, inputs, opts) {
    const creds = (opts && opts.credentials) || {};
    const apiKey = creds.apiKey;
    if (!apiKey) throw new Error('Missing Google AI apiKey in credentials');
    const model = String(inputs.model || creds.defaultModel || 'gemini-2.0-flash');
    const system = String(inputs.system || '').trim();
    const content = String(inputs.content || '').trim();
    const schema = inputs.extraction_schema || (node.model && node.model.context && node.model.context.extraction_schema) || [];
    if (!schema.length) throw new Error('Le schéma d\'extraction est requis');

    const img = inputs.image ? await resolveImageInput(inputs, opts) : null;
    if (!content && !img) throw new Error('Le contenu ou une image est requis');

    const result = await extractWithAx('google-gemini', apiKey, model, system, content, schema, img?.base64, img?.mimeType);
    return { ok: true, ...result };
  },
};
