// Anti self-redundancy : empêche l'agent principal d'appeler des tools LLM-chat
// (openai_chat_completion, anthropic_chat, etc.) pour des micro-questions qu'il
// peut résoudre lui-même.
//
// Pattern observé en prod (bug critique grillant les crédits) :
//   Loop 14: execute_tool(openai_chat_completion, "Le package python-docx est-il OK ? oui/non")
//   Loop 15: execute_tool(openai_chat_completion, "Cette formule est-elle valide ?")
//   Loop 16: execute_tool(openai_chat_completion, "Crée un dict Python DATA = {...}")
//   ... 20+ appels, ~150k tokens gâchés
//
// Le LLM principal est DÉJÀ un LLM — il peut répondre lui-même à ces questions.
//
// Stratégie :
//   1. Le 1er appel openai_chat_completion passe (peut être légitime, ex: workflow user)
//   2. À partir du 2e appel CONSÉCUTIF du même type sans intervention user :
//      → on inspecte le prompt
//      → si c'est une micro-question (prompt court + maxTokens<200 + pattern oui/non/dict)
//      → on BLOQUE et on injecte un tool_result d'erreur pédagogique
//   3. Si l'utilisateur a explicitement demandé "utilise openai" → le flag est levé
//      (détecté via dernier message user, regex)
//
// L'agent reçoit alors une erreur claire l'invitant à utiliser son propre raisonnement.

// Tools de chat LLM à protéger
const LLM_CHAT_TOOLS = new Set([
  'openai_chat_completion',
  'anthropic_chat',
  'anthropic_messages',
  'gemini_chat',
  'mistral_chat',
]);

// Heuristiques "micro-question résolvable par l'agent lui-même"
const MICRO_PATTERNS = [
  /\boui\s*\/\s*non\b/i,
  /uniquement\s+(par|avec)\s+un?\s+mot/i,
  /\bréponds?\s+uniquement\b/i,
  /littéral\s+(valide|exécutable)/i,
  /\bdict\s+python/i,
  /est-(elle|il)\s+(coh[eé]rent|valide|professionnel|correct)/i,
  /code\s+python\s+exécutable/i,
];

function _isMicroQuestion(args) {
  if (!args || typeof args !== 'object') return false;
  const prompt = String(args.prompt || '');
  const system = String(args.system || '');
  const maxTokens = Number(args.maxTokens || args.max_tokens || 0);
  const text = prompt + ' ' + system;

  // Critère 1 : maxTokens très court (signal fort de micro-question)
  if (maxTokens > 0 && maxTokens <= 200) return true;

  // Critère 2 : prompt + system courts ET pattern match
  if (text.length < 800 && MICRO_PATTERNS.some(re => re.test(text))) return true;

  return false;
}

function _isUserExplicitlyRequestedLLMChat(conversation) {
  // Cherche dans le dernier message user un signal "utilise openai/gpt/anthropic/claude"
  const lastUserMsg = [...(conversation || [])].reverse().find(m => m.role === 'user');
  const txt = String(lastUserMsg?.content || '').toLowerCase();
  if (!txt) return false;
  return /\b(utilise|appelle|via|avec)\s+(openai|gpt|chatgpt|anthropic|claude|gemini|mistral)\b/i.test(txt);
}

/**
 * Détecte si un tool call représente une self-redundancy à bloquer.
 *
 * @param {object} toolCall - { name, input }
 * @param {object} jobContext - state du job (mute _llmChatHistory)
 * @param {Array} conversation - pour détecter si user a explicitement demandé
 * @returns {{ blocked: boolean, reason?: string }}
 */
function detectSelfRedundancy(toolCall, jobContext, conversation) {
  if (!toolCall || toolCall.name !== 'execute_tool') return { blocked: false };
  const input = toolCall.input || {};
  const targetKey = String(input.key || '');
  if (!LLM_CHAT_TOOLS.has(targetKey)) return { blocked: false };

  // Si l'user a explicitement demandé ce LLM → on autorise
  if (_isUserExplicitlyRequestedLLMChat(conversation)) {
    return { blocked: false };
  }

  // Track les appels LLM-chat consécutifs dans ce job
  if (!jobContext) return { blocked: false };
  if (!jobContext._llmChatCallCount) jobContext._llmChatCallCount = 0;
  jobContext._llmChatCallCount++;

  // 1er appel passe toujours (peut être légitime)
  if (jobContext._llmChatCallCount === 1) return { blocked: false };

  // À partir du 2e appel CONSÉCUTIF, on vérifie si c'est une micro-question
  if (_isMicroQuestion(input.args || input)) {
    return {
      blocked: true,
      reason: `Tu appelles ${targetKey} pour la ${jobContext._llmChatCallCount}e fois dans cette session, sans demande explicite de l'utilisateur. Le prompt ressemble à une micro-question que tu peux résoudre TOI-MÊME (oui/non, génération de dict Python littéral, validation de cohérence, reformulation). TU ES DÉJÀ UN LLM — utilise ton propre raisonnement.`,
    };
  }

  return { blocked: false };
}

/**
 * Reset le compteur (à appeler quand l'agent appelle un tool différent — signal
 * qu'il sort du pattern de boucle LLM-chat).
 */
function resetLlmChatCounter(jobContext) {
  if (jobContext) jobContext._llmChatCallCount = 0;
}

/**
 * Construit le tool_result pédagogique injecté quand on bloque.
 */
function buildBlockedResult(toolName, reason) {
  return {
    ok: false,
    error: 'self_redundancy_blocked',
    message: reason,
    hint: 'Réponds toi-même à cette question dans ton prochain message. Si tu as besoin de générer du Python, fais-le directement dans execute_code. Si tu doutes d\'un fait, utilise web_search.',
  };
}

module.exports = {
  detectSelfRedundancy,
  resetLlmChatCounter,
  buildBlockedResult,
  LLM_CHAT_TOOLS,
};
