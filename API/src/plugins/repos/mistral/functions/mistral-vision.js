const { visionWithAx, resolveImageInput } = require('../../_shared/ax-helpers');

module.exports = {
  async mistral_vision(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const creds = (opts && opts.credentials) || {};
    const apiKey = creds.apiKey;
    if (!apiKey) throw new Error('Missing Mistral apiKey in credentials');
    const model = String(inputs.model || creds.defaultModel || 'pixtral-large-latest');
    const system = String(inputs.system || '').trim();
    const prompt = String(inputs.prompt || '').trim();
    if (!prompt) return { ok: false, error: 'Missing prompt' };

    const img = await resolveImageInput(inputs, opts);
    if (!img) return { ok: false, error: 'Missing image' };

    log('Analyse de l\'image...');
    const result = await visionWithAx('mistral', apiKey, model, system, prompt, img.base64, img.mimeType);
    return { ok: true, text: result.text };
  },
};
