const { extractWithAx, resolveImageInput } = require('../../_shared/ax-helpers');

module.exports = {
  async openai_extract(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const creds = (opts && opts.credentials) || {};
    const apiKey = creds.apiKey;
    if (!apiKey) throw new Error('Missing OpenAI apiKey in credentials');
    const model = String(inputs.model || creds.defaultModel || 'gpt-4o');
    const system = String(inputs.system || '').trim();
    const content = String(inputs.content || '').trim();
    const schema = inputs.extraction_schema || (node.model && node.model.context && node.model.context.extraction_schema) || [];
    const hasSchema = Array.isArray(schema) ? schema.length > 0 : (schema && typeof schema === 'object' && Array.isArray(schema.fields) && schema.fields.length > 0);
    if (!hasSchema) return { ok: false, error: 'Le schéma d\'extraction est requis' };

    const img = inputs.image ? await resolveImageInput(inputs, opts) : null;
    if (!content && !img) return { ok: false, error: 'Le contenu ou une image est requis' };

    log('Extraction en cours...');
    const result = await extractWithAx('openai', apiKey, model, system, content, schema, img?.base64, img?.mimeType);
    return { ok: true, ...result };
  },
};
