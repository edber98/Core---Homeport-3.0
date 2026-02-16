// Shared LLM helpers for classify/extract/vision across all AI providers
// Direct fetch calls — no dependency on @ax-llm/ax

// ─── Provider-specific chat completion ────────────────────────────────────────

async function chatCompletion(providerName, apiKey, model, messages, opts = {}) {
  const provider = PROVIDERS[providerName] || PROVIDERS[PROVIDER_ALIAS[providerName]];
  if (!provider) throw new Error(`Provider "${providerName}" non supporté`);
  return provider(apiKey, model, messages, opts);
}

const PROVIDER_ALIAS = {
  google_ai: 'google-gemini',
};

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function openaiChat(apiKey, model, messages, opts = {}) {
  const isReasoning = /^(gpt-5|o[1-9])/.test(model);
  const body = {
    model,
    messages: messages.map(m => formatOpenAIMessage(m)),
    ...(isReasoning ? {} : { temperature: 0.3 }),
    ...(isReasoning ? { max_completion_tokens: 2048 } : { max_tokens: 2048 }),
    ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
  };
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`OpenAI API ${res.status}: ${err.slice(0, 500)}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

function formatOpenAIMessage(msg) {
  if (typeof msg.content === 'string') return msg;
  // Multimodal content array
  const parts = msg.content.map(c => {
    if (c.type === 'text') return { type: 'text', text: c.text };
    if (c.type === 'image') return {
      type: 'image_url',
      image_url: { url: `data:${c.mimeType || 'image/png'};base64,${c.image}` },
    };
    return c;
  });
  return { role: msg.role, content: parts };
}

// ─── Anthropic ────────────────────────────────────────────────────────────────

async function anthropicChat(apiKey, model, messages, opts = {}) {
  const systemParts = messages.filter(m => m.role === 'system');
  const system = systemParts.map(m =>
    typeof m.content === 'string' ? m.content : m.content.map(c => c.text || '').join('')
  ).join('\n');
  const chatMessages = messages.filter(m => m.role !== 'system').map(m => formatAnthropicMessage(m));

  const body = {
    model,
    max_tokens: 2048,
    ...(system ? { system } : {}),
    messages: chatMessages,
  };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Anthropic API ${res.status}: ${err.slice(0, 500)}`);
  }
  const json = await res.json();
  return (json.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}

function formatAnthropicMessage(msg) {
  if (typeof msg.content === 'string') return msg;
  const parts = msg.content.map(c => {
    if (c.type === 'text') return { type: 'text', text: c.text };
    if (c.type === 'image') return {
      type: 'image',
      source: { type: 'base64', media_type: c.mimeType || 'image/png', data: c.image },
    };
    return c;
  });
  return { role: msg.role, content: parts };
}

// ─── Mistral ──────────────────────────────────────────────────────────────────

async function mistralChat(apiKey, model, messages, opts = {}) {
  const body = {
    model,
    messages: messages.map(m => formatOpenAIMessage(m)), // Same format as OpenAI
    temperature: 0.3,
    max_tokens: 2048,
    ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
  };
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Mistral API ${res.status}: ${err.slice(0, 500)}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

// ─── Google Gemini ────────────────────────────────────────────────────────────

async function geminiChat(apiKey, model, messages, opts = {}) {
  const systemParts = messages.filter(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const generationConfig = { temperature: 0.3, maxOutputTokens: 2048 };
  if (opts.jsonMode) generationConfig.responseMimeType = 'application/json';

  const body = {
    contents: chatMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: formatGeminiParts(m.content),
    })),
    generationConfig,
  };
  if (systemParts.length) {
    body.systemInstruction = {
      parts: systemParts.map(m => ({
        text: typeof m.content === 'string' ? m.content : m.content.map(c => c.text || '').join(''),
      })),
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Gemini API ${res.status}: ${err.slice(0, 500)}`);
  }
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
}

function formatGeminiParts(content) {
  if (typeof content === 'string') return [{ text: content }];
  return content.map(c => {
    if (c.type === 'text') return { text: c.text };
    if (c.type === 'image') return { inlineData: { mimeType: c.mimeType || 'image/png', data: c.image } };
    return { text: JSON.stringify(c) };
  });
}

const PROVIDERS = {
  openai: openaiChat,
  anthropic: anthropicChat,
  mistral: mistralChat,
  'google-gemini': geminiChat,
};

// ─── Utility: parse JSON from LLM text ───────────────────────────────────────

function parseJsonFromText(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  return null;
}

// ─── Classify ─────────────────────────────────────────────────────────────────

async function classifyWithAx(providerName, apiKey, model, systemPrompt, text, categories) {
  if (!categories || !categories.length) throw new Error('Au moins une catégorie est requise');
  if (!text) throw new Error('Le texte à classifier est requis');

  const catNames = categories.map(c => c.name);
  const catDescs = categories.map(c => `- ${c.name}${c.description ? ': ' + c.description : ''}`).join('\n');

  const prompt = `${systemPrompt ? systemPrompt + '\n\n' : ''}Tu es un classificateur expert. Classe le texte suivant dans exactement UNE des catégories ci-dessous.

Catégories disponibles :
${catDescs}

Texte à classifier :
"""
${text}
"""

Réponds avec un JSON valide contenant :
- "category": le nom exact de la catégorie choisie (parmi: ${catNames.join(', ')})
- "confidence": un nombre entre 0 et 1 représentant ta confiance
- "explanation": une courte explication de ton choix`;

  const raw = await chatCompletion(providerName, apiKey, model, [{ role: 'user', content: prompt }], { jsonMode: true });

  let parsed;
  try {
    parsed = parseJsonFromText(raw);
    if (!parsed) {
      parsed = { category: catNames[0], confidence: 0.5, explanation: raw };
    }
  } catch (parseErr) {
    console.warn('[classify] JSON parse error:', parseErr.message, 'raw:', raw.slice(0, 300));
    parsed = { category: catNames[0], confidence: 0.5, explanation: raw };
  }

  const chosen = categories.find(c => c.name === parsed.category) || categories[0];
  const outputId = chosen._id || String(categories.indexOf(chosen));
  return {
    category: parsed.category || chosen.name,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    explanation: parsed.explanation || '',
    _output: outputId,
  };
}

// ─── Resolve image input ──────────────────────────────────────────────────────

async function resolveImageInput(inputs, opts) {
  const imageVal = inputs.image || inputs.imageUrl || '';
  // Cas 1: fileRef d'un node précédent
  if (imageVal && typeof imageVal === 'object' && imageVal._type === 'fileRef') {
    const buf = await opts.files.resolveAsBuffer(imageVal);
    return { base64: buf.toString('base64'), mimeType: imageVal.mimeType || 'image/png' };
  }
  // Cas 2: data URI
  if (typeof imageVal === 'string' && imageVal.startsWith('data:')) {
    const [header, data] = imageVal.split(',');
    const mime = header.match(/data:([^;]+)/)?.[1] || 'image/png';
    return { base64: data, mimeType: mime };
  }
  // Cas 3: URL HTTP - télécharger
  if (typeof imageVal === 'string' && /^https?:\/\//i.test(imageVal)) {
    const res = await fetch(imageVal);
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') || 'image/png';
    return { base64: buf.toString('base64'), mimeType: mime };
  }
  // Cas 4: base64 brut
  if (typeof imageVal === 'string' && imageVal.length > 100) {
    return { base64: imageVal, mimeType: inputs.mediaType || 'image/png' };
  }
  return null;
}

// ─── Vision ───────────────────────────────────────────────────────────────────

async function visionWithAx(providerName, apiKey, model, systemPrompt, prompt, imageBase64, mimeType) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({
    role: 'user',
    content: [
      { type: 'image', mimeType: mimeType || 'image/jpeg', image: imageBase64 },
      { type: 'text', text: prompt },
    ],
  });

  const text = await chatCompletion(providerName, apiKey, model, messages);
  return { text };
}

// ─── Normalize schema ─────────────────────────────────────────────────────────

function normalizeSchema(schema) {
  if (Array.isArray(schema)) {
    console.log('[extract] normalizeSchema: array format, fields:', schema.length);
    return schema;
  }
  if (schema && typeof schema === 'object' && Array.isArray(schema.fields)) {
    const typeMap = { text: 'text', textarea: 'text', number: 'number', checkbox: 'boolean', boolean: 'boolean', date: 'date', tags: 'text_array', text_array: 'text_array', select: 'text', radio: 'text', email: 'text', url: 'text', tel: 'text', color: 'text', code: 'text', json: 'text' };
    const fields = schema.fields
      .filter(f => f.key && f.type !== 'textblock' && f.type !== 'section' && f.type !== 'section_array')
      .map(f => ({ key: f.key, type: typeMap[f.type] || 'text', label: f.label || f.key, description: f.description || '' }));
    console.log('[extract] normalizeSchema: FormSchema format, fields:', fields.map(f => `${f.key}(${f.type})`).join(', '));
    return fields;
  }
  console.warn('[extract] normalizeSchema: unrecognized format, returning empty', typeof schema, schema);
  return [];
}

// ─── Extract ──────────────────────────────────────────────────────────────────

async function extractWithAx(providerName, apiKey, model, systemPrompt, content, schemaFields, imageBase64, imageMimeType) {
  schemaFields = normalizeSchema(schemaFields);
  if (!schemaFields || !schemaFields.length) throw new Error('Le schéma d\'extraction est requis');
  if (!content && !imageBase64) throw new Error('Le contenu à analyser est requis');

  const typeMap = { text: 'string', number: 'number', boolean: 'boolean', date: 'string (ISO date)', array: 'array of strings', text_array: 'array of strings', number_array: 'array of numbers' };
  const fieldDescs = schemaFields.map(f => {
    const desc = f.description ? ` — ${f.description}` : '';
    return `- "${f.key}" (${typeMap[f.type] || 'string'}): ${f.label || f.key}${desc}`;
  }).join('\n');

  const fullPrompt = `${systemPrompt ? systemPrompt + '\n\n' : ''}Tu es un extracteur de données expert. Extrais les informations suivantes du contenu fourni.

Champs à extraire :
${fieldDescs}

${content ? `Contenu à analyser :\n"""\n${content}\n"""` : 'Analyse l\'image fournie.'}

Réponds avec un JSON valide contenant uniquement les champs demandés. Si une information n'est pas trouvée, utilise null.`;

  const userContent = imageBase64
    ? [
        { type: 'image', mimeType: imageMimeType || 'image/png', image: imageBase64 },
        { type: 'text', text: fullPrompt },
      ]
    : fullPrompt;

  const raw = await chatCompletion(providerName, apiKey, model, [{ role: 'user', content: userContent }], { jsonMode: true });

  let parsed;
  try {
    parsed = parseJsonFromText(raw) || {};
  } catch {
    parsed = {};
  }

  const result = {};
  for (const f of schemaFields) {
    result[f.key] = parsed[f.key] !== undefined ? parsed[f.key] : null;
  }
  return result;
}

module.exports = { classifyWithAx, extractWithAx, visionWithAx, resolveImageInput, normalizeSchema, chatCompletion };
