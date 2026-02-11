// Real OpenAI handlers (no simulation)
const { ChatOpenAI } = require('@langchain/openai');
const { OpenAIEmbeddings } = require('@langchain/openai');

function getChatModel(creds, model) {
  const apiKey = creds && creds.apiKey;
  const baseURL = creds && creds.baseUrl ? String(creds.baseUrl) : undefined;
  const organization = creds && creds.organization ? String(creds.organization) : undefined;
  if (!apiKey) throw new Error('Missing OpenAI apiKey in credentials');
  const opts = { apiKey, model, configuration: {} };
  if (baseURL) opts.baseURL = baseURL;
  if (organization) opts.configuration.organization = organization;
  return new ChatOpenAI(opts);
}

function getEmbeddingsModel(creds, model) {
  const apiKey = creds && creds.apiKey;
  const baseURL = creds && creds.baseUrl ? String(creds.baseUrl) : undefined;
  const organization = creds && creds.organization ? String(creds.organization) : undefined;
  if (!apiKey) throw new Error('Missing OpenAI apiKey in credentials');
  const opts = { apiKey, model, configuration: {} };
  if (baseURL) opts.baseURL = baseURL;
  if (organization) opts.configuration.organization = organization;
  return new OpenAIEmbeddings(opts);
}

module.exports = {
  // Chat completion: system + user
  async openai_chat_completion(node, msg, inputs, opts) {
    const creds = (opts && opts.credentials) || {};
    const modelName = String(inputs.model || creds.defaultModel || 'gpt-4o-mini');
    const temperature = (inputs.temperature == null ? 0.7 : Number(inputs.temperature));
    const maxTokens = inputs.maxTokens != null ? Number(inputs.maxTokens) : undefined;
    const sys = String(inputs.system || '').trim();
    const prompt = String(inputs.prompt || '').trim();
    const llm = getChatModel(creds, modelName).bind({ temperature, max_tokens: maxTokens });
    const messages = [];
    if (sys) messages.push({ role: 'system', content: sys });
    messages.push({ role: 'user', content: prompt });
    const res = await llm.invoke(messages);
    const text = (res && res.content) || '';
    return { ok: true, text };
  },

  // Embeddings for a single string or array of strings (JSON array string accepted)
  async openai_embeddings(node, msg, inputs, opts) {
    const creds = (opts && opts.credentials) || {};
    const modelName = String(inputs.model || 'text-embedding-3-small');
    let inp = inputs.input;
    if (typeof inp === 'string') {
      const t = inp.trim();
      if (t.startsWith('[') && t.endsWith(']')) {
        try { inp = JSON.parse(t); } catch {}
      }
    }
    const input = Array.isArray(inp) ? inp.map(v => String(v)) : [ String(inp || '') ];
    const emb = getEmbeddingsModel(creds, modelName);
    const vectors = await emb.embedDocuments(input);
    return { ok: true, vectorsCount: vectors.length, dimensions: vectors[0] ? vectors[0].length : 0, vectors };
  },

  // Image generation
  async openai_image_generate(node, msg, inputs, opts) {
    const creds = (opts && opts.credentials) || {};
    const apiKey = creds && creds.apiKey;
    const baseURL = creds && creds.baseUrl ? String(creds.baseUrl) : 'https://api.openai.com/v1';
    if (!apiKey) throw new Error('Missing OpenAI apiKey in credentials');
    const model = String(inputs.model || 'gpt-image-1');
    const prompt = String(inputs.prompt || '');
    const size = String(inputs.size || '1024x1024');
    const res = await fetch(`${baseURL.replace(/\/$/,'')}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, prompt, size })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI images API failed: ${res.status} ${text}`);
    }
    const out = await res.json();
    const images = [];
    for (let i = 0; i < (out.data || []).length; i++) {
      const d = out.data[i];
      const url = d.url || null;
      const b64 = d.b64_json || null;
      let file = null;
      if (opts.files && b64) {
        file = await opts.files.store(b64, {
          name: `generated_image_${i + 1}.png`,
          mimeType: 'image/png',
          lifecycle: 'execution'
        });
      }
      images.push({ url, b64, file });
    }
    return { ok: true, images };
  },
  // Memory embeddings from text (real embeddings)
  async openai_memory_embed(node, msg, inputs, opts) {
    const creds = (opts && opts.credentials) || {};
    const modelName = String(inputs.model || 'text-embedding-3-small');
    // Prefer text from args, else look at incoming handle 'in'
    let text = String(inputs.text || '');
    try {
      const incoming = (opts && opts.incoming && opts.incoming.byHandle) ? opts.incoming.byHandle : {};
      const fromIn = Array.isArray(incoming['in']) && incoming['in'][0] ? incoming['in'][0] : null;
      if (!text && fromIn && typeof fromIn === 'object') {
        const t = fromIn.text || fromIn.content || fromIn.raw || fromIn.payload || '';
        text = String(t || '');
      }
    } catch {}
    const emb = getEmbeddingsModel(creds, modelName);
    const vectors = await emb.embedDocuments([ text ]);
    return { ok: true, type: 'ai_memory', texts: [text], vectors };
  },
  // Agent that consumes memory/tools via incoming handles and produces a real answer via ChatOpenAI
  async openai_agent(node, msg, inputs, opts) {
    const creds = (opts && opts.credentials) || {};
    const modelName = String(inputs.model || creds.defaultModel || 'gpt-4o-mini');
    const temperature = (inputs.temperature == null ? 0.7 : Number(inputs.temperature));
    const sys = String(inputs.system || '').trim();
    const prompt = String(inputs.prompt || '').trim();
    const llm = getChatModel(creds, modelName).bind({ temperature });
    // Collect memory/context/tool descriptions from incoming
    const incoming = (opts && opts.incoming && opts.incoming.byHandle) ? opts.incoming.byHandle : {};
    const memories = Array.isArray(incoming['memory']) ? incoming['memory'] : [];
    const tools = Array.isArray(incoming['tools']) ? incoming['tools'] : [];
    const contexts = Array.isArray(incoming['context']) ? incoming['context'] : [];
    const memText = memories.map((m) => {
      try { if (m && Array.isArray(m.texts)) return m.texts.join('\n'); if (m && typeof m.text === 'string') return m.text; } catch {} return ''; }).filter(Boolean).join('\n');
    const toolText = tools.map((t) => {
      const name = t?.name || t?.title || 'tool';
      const desc = t?.description || '';
      return `- ${name}: ${desc}`;
    }).join('\n');
    const ctxText = contexts.map((c) => typeof c === 'string' ? c : JSON.stringify(c)).join('\n');
    const sysParts = [];
    if (sys) sysParts.push(sys);
    if (toolText) sysParts.push(`Available tools:\n${toolText}`);
    if (memText) sysParts.push(`Memory:\n${memText}`);
    if (ctxText) sysParts.push(`Context:\n${ctxText}`);
    const sysMsg = sysParts.join('\n\n');
    const messages = [];
    if (sysMsg) messages.push({ role: 'system', content: sysMsg });
    messages.push({ role: 'user', content: prompt });
    const res = await llm.invoke(messages);
    const text = (res && res.content) || '';
    return { ok: true, text };
  },
  // Memory static (text→ai_memory)
  async openai_memory_static(node, msg, inputs, opts) {
    const text = String(inputs.text || '').trim();
    return { ok: true, type: 'ai_memory', texts: text ? [text] : [] };
  },
  // Memory merge: pass-through with optional dedupe
  async openai_memory_merge(node, msg, inputs, opts) {
    const arrs = [];
    if (Array.isArray(inputs?.texts)) arrs.push(inputs.texts);
    if (Array.isArray(inputs?.memory?.texts)) arrs.push(inputs.memory.texts);
    if (Array.isArray(msg?.texts)) arrs.push(msg.texts);
    const flat = ([]).concat(...arrs);
    const dedupe = !!(node?.context?.dedupe);
    const texts = dedupe ? Array.from(new Set(flat)) : flat;
    return { ok: true, type: 'ai_memory', texts };
  },
  // Tool define (LangChain-like tool descriptor)
  async openai_tool_define(node, msg, inputs, opts) {
    const name = String(inputs.name || '').trim();
    const description = String(inputs.description || '').trim();
    let schema = {};
    try { if (typeof inputs.parameters === 'string') schema = JSON.parse(inputs.parameters); else if (inputs.parameters) schema = inputs.parameters; } catch { schema = {}; }
    return { ok: true, type: 'ai_tool', name, description, schema };
  },
  // Aliases to cover camelCase / underscore normalization discrepancies
  async openaichatcompletion(node, msg, inputs, opts) { return module.exports.openai_chat_completion(node, msg, inputs, opts); },
  async openaiChatCompletion(node, msg, inputs, opts) { return module.exports.openai_chat_completion(node, msg, inputs, opts); },
  async openaiembeddings(node, msg, inputs, opts) { return module.exports.openai_embeddings(node, msg, inputs, opts); },
  async openaiEmbeddings(node, msg, inputs, opts) { return module.exports.openai_embeddings(node, msg, inputs, opts); },
  async openaiimagegenerate(node, msg, inputs, opts) { return module.exports.openai_image_generate(node, msg, inputs, opts); },
  async openaiImageGenerate(node, msg, inputs, opts) { return module.exports.openai_image_generate(node, msg, inputs, opts); },
};
