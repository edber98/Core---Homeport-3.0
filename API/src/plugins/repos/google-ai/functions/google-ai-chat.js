const { createAxAI } = require('../../_shared/ax-helpers');

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

    const ai = createAxAI('google-gemini', apiKey, model);
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    log('Envoi du prompt...');
    const res = await ai.chat({ chatPrompt: messages, model });
    const text = typeof res === 'string' ? res : (res?.content || res?.results?.[0]?.content || JSON.stringify(res));
    return { ok: true, text };
  },
};
