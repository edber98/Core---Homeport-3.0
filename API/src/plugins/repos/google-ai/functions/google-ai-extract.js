const { extractWithAx, resolveImageInput } = require('../../_shared/ax-helpers');

module.exports = {
  async google_ai_extract(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const creds = (opts && opts.credentials) || {};
    const apiKey = creds.apiKey;
    if (!apiKey) return { ok: false, error: 'Clé API Google AI manquante.' };
    const model = String(inputs.model || creds.defaultModel || 'gemini-2.0-flash');
    const system = String(inputs.system || '').trim();
    const content = String(inputs.content || '').trim();
    const schema = inputs.extraction_schema || (node.model && node.model.context && node.model.context.extraction_schema) || [];
    const hasSchema = Array.isArray(schema) ? schema.length > 0 : (schema && typeof schema === 'object' && Array.isArray(schema.fields) && schema.fields.length > 0);
    if (!hasSchema) return { ok: false, error: 'Le schéma d\'extraction est requis.' };

    const img = inputs.image ? await resolveImageInput(inputs, opts) : null;
    if (!content && !img) return { ok: false, error: 'Le contenu ou une image est requis.' };

    log('Extraction en cours...');
    try {
      const result = await extractWithAx('google-gemini', apiKey, model, system, content, schema, img?.base64, img?.mimeType);
      return { ok: true, ...result };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
};
