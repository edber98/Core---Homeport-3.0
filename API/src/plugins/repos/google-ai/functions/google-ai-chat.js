const { chatCompletion } = require('../../_shared/ax-helpers');

module.exports = {
  async google_ai_chat(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const creds = (opts && opts.credentials) || {};
    const apiKey = creds.apiKey;
    if (!apiKey) throw new Error('Missing Google AI apiKey in credentials');
    const model = String(inputs.model || creds.defaultModel || 'gemini-2.0-flash');
    const system = String(inputs.system || '').trim();
    const prompt = String(inputs.prompt || '').trim();
    if (!prompt) throw new Error('Le prompt est requis');

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    log('Envoi du prompt...');
    const text = await chatCompletion('google-gemini', apiKey, model, messages);
    return { ok: true, text };
  },
};
