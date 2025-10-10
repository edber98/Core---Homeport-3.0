// Real OpenAI handlers (no simulation)
const OpenAI = require('openai');

function getClient(creds) {
  const apiKey = creds && creds.apiKey;
  const baseURL = creds && creds.baseUrl ? String(creds.baseUrl) : undefined;
  const organization = creds && creds.organization ? String(creds.organization) : undefined;
  if (!apiKey) throw new Error('Missing OpenAI apiKey in credentials');
  return new OpenAI({ apiKey, baseURL, organization });
}

module.exports = {
  // Chat completion: system + user
  async openai_chat_completion(node, msg, inputs, opts) {
    const creds = (opts && opts.credentials) || {};
    const client = getClient(creds);
    const model = String(inputs.model || creds.defaultModel || 'gpt-4o-mini');
    const temperature = (inputs.temperature == null ? 0.7 : Number(inputs.temperature));
    const max_tokens = inputs.maxTokens != null ? Number(inputs.maxTokens) : undefined;
    const sys = String(inputs.system || '').trim();
    const prompt = String(inputs.prompt || '').trim();
    const messages = [];
    if (sys) messages.push({ role: 'system', content: sys });
    messages.push({ role: 'user', content: prompt });
    const out = await client.chat.completions.create({ model, messages, temperature, max_tokens });
    const choice = out.choices && out.choices[0] || {};
    const text = (choice.message && choice.message.content) || '';
    return { ok: true, text, raw: { id: out.id, model: out.model, usage: out.usage } };
  },

  // Embeddings for a single string or array of strings (JSON array string accepted)
  async openai_embeddings(node, msg, inputs, opts) {
    const creds = (opts && opts.credentials) || {};
    const client = getClient(creds);
    const model = String(inputs.model || 'text-embedding-3-small');
    let inp = inputs.input;
    if (typeof inp === 'string') {
      const t = inp.trim();
      if (t.startsWith('[') && t.endsWith(']')) {
        try { inp = JSON.parse(t); } catch {}
      }
    }
    const input = Array.isArray(inp) ? inp.map(v => String(v)) : [ String(inp || '') ];
    const out = await client.embeddings.create({ model, input });
    const vectors = (out.data || []).map((d) => d.embedding);
    return { ok: true, vectorsCount: vectors.length, dimensions: vectors[0] ? vectors[0].length : 0, vectors };
  },

  // Image generation
  async openai_image_generate(node, msg, inputs, opts) {
    const creds = (opts && opts.credentials) || {};
    const client = getClient(creds);
    const model = String(inputs.model || 'gpt-image-1');
    const prompt = String(inputs.prompt || '');
    const size = String(inputs.size || '1024x1024');
    const out = await client.images.generate({ model, prompt, size });
    // Return URLs when available; some setups may return b64_json
    const images = (out.data || []).map((d) => ({ url: d.url || null, b64: d.b64_json || null }));
    return { ok: true, images };
  },
};

