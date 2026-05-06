// Token counter — estimation rapide de la consommation tokens d'une conversation.
// Pas de tiktoken (dépendance lourde) : règle empirique ~3.5 chars/token qui
// sur-estime légèrement (~10-15%) donc user voit jauge "conservative".

const AiMessage = require('../../db/models/ai-message.model');

/** Estimation tokens d'un texte simple. */
function countTokens(text) {
  if (!text) return 0;
  const s = typeof text === 'string' ? text : String(text);
  return Math.ceil(s.length / 3.5);
}

/** Estimation tokens d'un AiMessage (content + toolCalls serialisés). */
function estimateMessageTokens(msg) {
  if (!msg) return 0;
  let total = countTokens(msg.content || '');
  if (Array.isArray(msg.toolCalls)) {
    for (const tc of msg.toolCalls) {
      try {
        total += countTokens(JSON.stringify({
          name: tc.name,
          args: tc.args,
          result: tc.result,
        }));
      } catch {}
    }
  }
  if (Array.isArray(msg.segments)) {
    // Segments texte sont déjà inclus via content, on saute
  }
  // Overhead rôle + ponctuation LLM ~4 tokens/message
  return total + 4;
}

/** Addition tokens de tous les AiMessage d'un thread. */
async function countThreadTokens(threadId) {
  if (!threadId) return { tokens: 0, messageCount: 0 };
  const messages = await AiMessage.find({ threadId })
    .select('content toolCalls segments')
    .lean();
  let total = 0;
  for (const m of messages) total += estimateMessageTokens(m);
  return { tokens: total, messageCount: messages.length };
}

/** Limites de contexte par modèle. Override possible via process.env.AI_MODEL_LIMITS (JSON). */
const MODEL_LIMITS = {
  'gpt-5.2': 400_000,
  'gpt-5.1': 400_000,
  'gpt-5': 400_000,
  'gpt-4.1': 1_000_000,
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-4': 128_000,
  'claude-opus-4-6': 200_000,
  'claude-opus-4': 200_000,
  'claude-sonnet-4-6': 1_000_000,
  'claude-sonnet-4-5': 200_000,
  'claude-sonnet-4': 200_000,
  'claude-sonnet': 200_000,
  'claude-haiku-4-5-20251001': 200_000,
  'claude-haiku': 200_000,
};

try {
  const raw = process.env.AI_MODEL_LIMITS;
  if (raw) Object.assign(MODEL_LIMITS, JSON.parse(raw));
} catch { /* ignore */ }

function resolveLimit(modelName) {
  if (!modelName) return 128_000;
  // Match exact puis préfixe
  if (MODEL_LIMITS[modelName]) return MODEL_LIMITS[modelName];
  for (const key of Object.keys(MODEL_LIMITS)) {
    if (modelName.startsWith(key)) return MODEL_LIMITS[key];
  }
  return 128_000;
}

module.exports = {
  countTokens,
  estimateMessageTokens,
  countThreadTokens,
  resolveLimit,
  MODEL_LIMITS,
};
