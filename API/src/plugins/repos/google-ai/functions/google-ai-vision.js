const { visionWithAx, resolveImageInput } = require('../../_shared/ax-helpers');

module.exports = {
  async google_ai_vision(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const creds = (opts && opts.credentials) || {};
    const apiKey = creds.apiKey;
    if (!apiKey) throw new Error('Missing Google AI apiKey in credentials');
    const model = String(inputs.model || creds.defaultModel || 'gemini-2.0-flash');
    const system = String(inputs.system || '').trim();
    const prompt = String(inputs.prompt || '').trim();
    if (!prompt) return { ok: false, error: 'Missing prompt' };

    const img = await resolveImageInput(inputs, opts);
    if (!img) return { ok: false, error: 'Missing image' };

    log('Analyse de l\'image...');
    const result = await visionWithAx('google-gemini', apiKey, model, system, prompt, img.base64, img.mimeType);
    return { ok: true, text: result.text };
  },
};
