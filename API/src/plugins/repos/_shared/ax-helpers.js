// Shared ax helpers for classify/extract across all AI providers
const { AxAI, AxChainOfThought, AxGen } = require('@ax-llm/ax');

const PROVIDER_MAP = {
  openai: 'openai',
  anthropic: 'anthropic',
  mistral: 'mistral',
  'google-gemini': 'google-gemini',
  google_ai: 'google-gemini',
};

function createAxAI(providerName, apiKey, model, options = {}) {
  const name = PROVIDER_MAP[providerName] || providerName;
  return new AxAI({ name, apiKey, model, ...options });
}

/**
 * Classify text into one of the provided categories using ax.
 * @param {string} providerName - ax provider name (openai, anthropic, mistral, google-gemini)
 * @param {string} apiKey - API key
 * @param {string} model - Model identifier
 * @param {string} systemPrompt - System instructions
 * @param {string} text - Text to classify
 * @param {Array<{_id:string, name:string, description?:string}>} categories - Categories
 * @returns {{ category: string, confidence: number, explanation: string, _output: string }}
 */
async function classifyWithAx(providerName, apiKey, model, systemPrompt, text, categories) {
  if (!categories || !categories.length) throw new Error('Au moins une catégorie est requise');
  if (!text) throw new Error('Le texte à classifier est requis');

  const ai = createAxAI(providerName, apiKey, model);
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

  const res = await ai.chat({ chatPrompt: [{ role: 'user', content: prompt }], model });
  let parsed;
  try {
    const raw = typeof res === 'string' ? res : (res?.content || res?.results?.[0]?.content || JSON.stringify(res));
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { category: catNames[0], confidence: 0.5, explanation: raw };
  } catch {
    parsed = { category: catNames[0], confidence: 0.5, explanation: String(res) };
  }

  // Find matching category
  const chosen = categories.find(c => c.name === parsed.category) || categories[0];
  return {
    category: parsed.category || chosen.name,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    explanation: parsed.explanation || '',
    _output: chosen._id || String(categories.indexOf(chosen)),
  };
}

/**
 * Extract structured data from content using ax.
 * @param {string} providerName - ax provider name
 * @param {string} apiKey - API key
 * @param {string} model - Model identifier
 * @param {string} systemPrompt - System instructions
 * @param {string} content - Content to extract from
 * @param {Array<{key:string, type:string, label:string}>} schemaFields - Extraction schema
 * @returns {Object} Extracted fields
 */
/**
 * Resolve an image from handler inputs (fileRef, data URI, HTTP URL, raw base64).
 * @param {Object} inputs - Handler inputs
 * @param {Object} opts - Handler opts (with opts.files for fileRef resolution)
 * @returns {{ base64: string, mimeType: string } | null}
 */
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

/**
 * Analyse an image with a prompt using ax multimodal.
 * @param {string} providerName - ax provider name
 * @param {string} apiKey - API key
 * @param {string} model - Model identifier
 * @param {string} systemPrompt - System instructions
 * @param {string} prompt - User prompt about the image
 * @param {string} imageBase64 - Base64-encoded image data
 * @param {string} mimeType - Image MIME type
 * @returns {{ text: string }}
 */
async function visionWithAx(providerName, apiKey, model, systemPrompt, prompt, imageBase64, mimeType) {
  const ai = createAxAI(providerName, apiKey, model);
  const content = [
    { type: 'image', mimeType: mimeType || 'image/jpeg', image: imageBase64 },
    { type: 'text', text: prompt }
  ];
  const chatPrompt = [];
  if (systemPrompt) chatPrompt.push({ role: 'system', content: systemPrompt });
  chatPrompt.push({ role: 'user', content });
  const res = await ai.chat({ chatPrompt, model });
  const text = typeof res.results?.[0]?.content === 'string'
    ? res.results[0].content
    : JSON.stringify(res.results?.[0]?.content || '');
  return { text };
}

/**
 * Normalize extraction schema: accepts SchemaField[] or FormSchema and returns SchemaField[].
 * FormSchema has { fields: FieldConfig[] } where FieldConfig has form types (text, textarea, number, checkbox, etc.)
 */
function normalizeSchema(schema) {
  // Already a flat SchemaField[] array
  if (Array.isArray(schema)) return schema;
  // FormSchema object with fields array
  if (schema && typeof schema === 'object' && Array.isArray(schema.fields)) {
    const typeMap = { text: 'text', textarea: 'text', number: 'number', checkbox: 'boolean', date: 'date', tags: 'text_array', select: 'text', radio: 'text' };
    return schema.fields
      .filter(f => f.key && f.type !== 'textblock' && f.type !== 'section' && f.type !== 'section_array')
      .map(f => ({ key: f.key, type: typeMap[f.type] || 'text', label: f.label || f.key }));
  }
  return [];
}

async function extractWithAx(providerName, apiKey, model, systemPrompt, content, schemaFields, imageBase64, imageMimeType) {
  schemaFields = normalizeSchema(schemaFields);
  if (!schemaFields || !schemaFields.length) throw new Error('Le schéma d\'extraction est requis');
  if (!content && !imageBase64) throw new Error('Le contenu à analyser est requis');

  const ai = createAxAI(providerName, apiKey, model);
  const typeMap = { text: 'string', number: 'number', boolean: 'boolean', date: 'string (ISO date)', array: 'array of strings', text_array: 'array of strings', number_array: 'array of numbers' };
  const fieldDescs = schemaFields.map(f => `- "${f.key}" (${typeMap[f.type] || 'string'}): ${f.label || f.key}`).join('\n');

  const fullPrompt = `${systemPrompt ? systemPrompt + '\n\n' : ''}Tu es un extracteur de données expert. Extrais les informations suivantes du contenu fourni.

Champs à extraire :
${fieldDescs}

${content ? `Contenu à analyser :\n"""\n${content}\n"""` : 'Analyse l\'image fournie.'}

Réponds avec un JSON valide contenant uniquement les champs demandés. Si une information n'est pas trouvée, utilise null.`;

  const userContent = imageBase64
    ? [
        { type: 'image', mimeType: imageMimeType || 'image/png', image: imageBase64 },
        { type: 'text', text: fullPrompt }
      ]
    : fullPrompt;

  const res = await ai.chat({ chatPrompt: [{ role: 'user', content: userContent }], model });
  let parsed;
  try {
    const raw = typeof res === 'string' ? res : (res?.content || res?.results?.[0]?.content || JSON.stringify(res));
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    parsed = {};
  }

  // Ensure all schema keys exist
  const result = {};
  for (const f of schemaFields) {
    result[f.key] = parsed[f.key] !== undefined ? parsed[f.key] : null;
  }
  return result;
}

module.exports = { classifyWithAx, extractWithAx, visionWithAx, resolveImageInput, normalizeSchema, createAxAI };
