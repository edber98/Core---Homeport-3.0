// Real OpenAI handlers (no simulation)
const { ChatOpenAI } = require('@langchain/openai');
const { OpenAIEmbeddings } = require('@langchain/openai');

function normalizeOpenAIError(err, res) {
  try {
    const status = Number(err?.status || err?.statusCode || err?.response?.status || res?.status);
    const data = err?.response?.data || err?.error || err?.cause || err?.body || null;
    let message = err?.message;
    if (data?.error?.message) message = data.error.message;
    else if (data?.message) message = data.message;
    else if (typeof data === 'string') message = data;
    let inferredStatus = Number.isFinite(status) ? status : undefined;
    if (!Number.isFinite(inferredStatus) && typeof message === 'string') {
      let m = message.match(/^(\d{3})\b/);
      if (!m) m = message.match(/\bstatus\s*[:=]?\s*(\d{3})\b/i);
      if (!m) m = message.match(/\bcode\s*[:=]?\s*(\d{3})\b/i);
      if (m) inferredStatus = Number(m[1]);
    }
    const code = data?.error?.code || data?.code || err?.code;
    const type = data?.error?.type || data?.type;
    return {
      status: Number.isFinite(inferredStatus) ? inferredStatus : undefined,
      message: message ? String(message) : '',
      code,
      type
    };
  } catch {
    return { message: err?.message ? String(err.message) : '' };
  }
}

function mapOpenAIError(info) {
  const raw = String(info?.message || '').trim();
  const msg = raw.toLowerCase();
  const status = info?.status;
  let displayMessage = '';
  let code = info?.code ? String(info.code) : undefined;

  // Local config errors
  if (!displayMessage && msg.includes('missing openai apikey')) {
    displayMessage = 'Clé API OpenAI manquante. Ajoutez-la dans les credentials.';
    code = code || 'missing_api_key';
  }

  // Status-based mapping
  if (!displayMessage && status === 400) {
    displayMessage = 'Requête invalide. Vérifiez les paramètres.';
    code = code || 'invalid_request';
  } else if (!displayMessage && status === 422) {
    displayMessage = 'Requête invalide. Vérifiez les paramètres.';
    code = code || 'invalid_request';
  } else if (!displayMessage && status === 404) {
    displayMessage = 'Ressource OpenAI introuvable (modèle ou endpoint).';
    code = code || 'not_found';
  } else if (!displayMessage && status === 401) {
    if (msg.includes('invalid authentication')) {
      displayMessage = 'Authentification invalide. Vérifiez la clé API et l’organisation.';
      code = code || 'auth_invalid';
    } else if (msg.includes('incorrect api key') || (msg.includes('api key') && msg.includes('incorrect'))) {
      displayMessage = 'Clé API incorrecte. Vérifiez la clé ou générez-en une nouvelle.';
      code = code || 'auth_bad_key';
    } else if (msg.includes('member of an organization') || (msg.includes('organization') && msg.includes('member'))) {
      displayMessage = 'Votre compte n’est pas membre d’une organisation OpenAI.';
      code = code || 'auth_org_required';
    } else if (msg.includes('ip') && (msg.includes('allowlist') || msg.includes('not authorized'))) {
      displayMessage = 'IP non autorisée. Vérifiez la liste d’IP autorisées.';
      code = code || 'auth_ip_not_allowed';
    } else {
      displayMessage = 'Authentification requise. Vérifiez vos identifiants.';
      code = code || 'auth_required';
    }
  } else if (!displayMessage && status === 403) {
    if (msg.includes('country') || msg.includes('region') || msg.includes('territory') || msg.includes('unsupported')) {
      displayMessage = 'Pays ou région non supporté(e) par OpenAI.';
      code = code || 'region_not_supported';
    }
  } else if (!displayMessage && status === 429) {
    if (msg.includes('quota') || msg.includes('billing') || msg.includes('insufficient_quota') || msg.includes('exceeded your current quota')) {
      displayMessage = 'Quota OpenAI atteint. Vérifiez votre plan et la facturation.';
      code = code || 'quota_exceeded';
    } else {
      displayMessage = 'Limite de débit atteinte. Réduisez la cadence et réessayez.';
      code = code || 'rate_limited';
    }
  } else if (!displayMessage && status === 500) {
    displayMessage = 'Erreur OpenAI côté serveur. Réessayez plus tard.';
    code = code || 'server_error';
  } else if (!displayMessage && status === 503) {
    if (msg.includes('slow down')) {
      displayMessage = 'Ralentissez vos requêtes (slow down). Réessayez plus tard.';
      code = code || 'slow_down';
    } else if (msg.includes('overloaded')) {
      displayMessage = 'OpenAI est surchargé. Réessayez plus tard.';
      code = code || 'overloaded';
    } else {
      displayMessage = 'Service OpenAI indisponible. Réessayez plus tard.';
      code = code || 'service_unavailable';
    }
  } else if (!displayMessage && typeof status === 'number' && status >= 500 && status <= 599) {
    displayMessage = 'Service OpenAI indisponible. Réessayez plus tard.';
    code = code || 'service_unavailable';
  }
  // Message-based fallback (when status missing)
  if (!displayMessage) {
    if (/invalid authentication|incorrect api key|invalid api key/.test(msg)) {
      displayMessage = 'Authentification invalide. Vérifiez la clé API et l’organisation.';
      code = code || 'auth_invalid';
    } else if (/member of an organization|organization.*member/.test(msg)) {
      displayMessage = 'Votre compte n’est pas membre d’une organisation OpenAI.';
      code = code || 'auth_org_required';
    } else if (/ip .*not authorized|allowlist/.test(msg)) {
      displayMessage = 'IP non autorisée. Vérifiez la liste d’IP autorisées.';
      code = code || 'auth_ip_not_allowed';
    } else if (/country|region|territory|unsupported/.test(msg)) {
      displayMessage = 'Pays ou région non supporté(e) par OpenAI.';
      code = code || 'region_not_supported';
    } else if (/quota|billing|insufficient_quota|exceeded your current quota/.test(msg)) {
      displayMessage = 'Quota OpenAI atteint. Vérifiez votre plan et la facturation.';
      code = code || 'quota_exceeded';
    } else if (/rate limit|too many requests/.test(msg)) {
      displayMessage = 'Limite de débit atteinte. Réduisez la cadence et réessayez.';
      code = code || 'rate_limited';
    } else if (/slow down/.test(msg)) {
      displayMessage = 'Ralentissez vos requêtes (slow down). Réessayez plus tard.';
      code = code || 'slow_down';
    } else if (/overloaded/.test(msg)) {
      displayMessage = 'OpenAI est surchargé. Réessayez plus tard.';
      code = code || 'overloaded';
    } else if (/invalid_request|invalid request|bad request/.test(msg)) {
      displayMessage = 'Requête invalide. Vérifiez les paramètres.';
      code = code || 'invalid_request';
    } else if (/not found|no such model|model not found/.test(msg)) {
      displayMessage = 'Ressource OpenAI introuvable (modèle ou endpoint).';
      code = code || 'not_found';
    }
  }

  const out = { ok: false, error: raw || 'OpenAI error' };
  if (typeof status === 'number') out.status = status;
  if (code) out.code = code;
  if (info?.type) out.type = info.type;
  if (displayMessage) out.displayMessage = displayMessage;
  return out;
}

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
    try {
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
    } catch (e) {
      return mapOpenAIError(normalizeOpenAIError(e));
    }
  },

  // Embeddings for a single string or array of strings (JSON array string accepted)
  async openai_embeddings(node, msg, inputs, opts) {
    try {
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
    } catch (e) {
      return mapOpenAIError(normalizeOpenAIError(e));
    }
  },

  // Image generation
  async openai_image_generate(node, msg, inputs, opts) {
    try {
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
        let data = null;
        try { data = JSON.parse(text); } catch { data = text; }
        const message = data?.error?.message || (typeof data === 'string' ? data : text);
        const info = normalizeOpenAIError({ message, code: data?.error?.code, type: data?.error?.type }, res);
        return mapOpenAIError(info);
      }
      const out = await res.json();
      const images = (out.data || []).map((d) => ({ url: d.url || null, b64: d.b64_json || null }));
      return { ok: true, images };
    } catch (e) {
      return mapOpenAIError(normalizeOpenAIError(e));
    }
  },
  // Memory embeddings from text (real embeddings)
  async openai_memory_embed(node, msg, inputs, opts) {
    try {
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
    } catch (e) {
      return mapOpenAIError(normalizeOpenAIError(e));
    }
  },
  // Agent that consumes memory/tools via incoming handles and produces a real answer via ChatOpenAI
  async openai_agent(node, msg, inputs, opts) {
    try {
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
    } catch (e) {
      return mapOpenAIError(normalizeOpenAIError(e));
    }
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
