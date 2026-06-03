// Tests du garde-fou anti self-redundancy.
//
// L'agent principal NE DOIT PAS appeler openai_chat_completion / anthropic_chat
// pour des micro-questions qu'il peut résoudre lui-même.

const { test } = require('node:test');
const assert = require('node:assert');

const {
  detectSelfRedundancy,
  resetLlmChatCounter,
  buildBlockedResult,
  LLM_CHAT_TOOLS,
} = require('../src/ai/harness/anti-self-redundancy');

function makeCtx() { return {}; }

test('1er appel openai_chat_completion : autorisé', () => {
  const ctx = makeCtx();
  const tc = { name: 'execute_tool', input: { key: 'openai_chat_completion', args: { prompt: 'Q', maxTokens: 50 } } };
  const r = detectSelfRedundancy(tc, ctx, [{ role: 'user', content: 'fais un truc' }]);
  assert.strictEqual(r.blocked, false);
  assert.strictEqual(ctx._llmChatCallCount, 1);
});

test('2e appel micro-question oui/non : BLOQUÉ', () => {
  const ctx = makeCtx();
  const conv = [{ role: 'user', content: 'génère un docx' }];
  // 1er appel (autorisé)
  detectSelfRedundancy({ name: 'execute_tool', input: { key: 'openai_chat_completion', args: { prompt: 'Q1', maxTokens: 50 } } }, ctx, conv);
  // 2e appel micro
  const tc = {
    name: 'execute_tool',
    input: { key: 'openai_chat_completion', args: { prompt: 'Le code Python est-il valide ? Réponds uniquement par un mot : oui ou non.', maxTokens: 5 } },
  };
  const r = detectSelfRedundancy(tc, ctx, conv);
  assert.strictEqual(r.blocked, true);
  assert.match(r.reason, /TU ES DÉJÀ UN LLM/);
});

test('2e appel mais user a explicitement demandé OpenAI : AUTORISÉ', () => {
  const ctx = makeCtx();
  const conv = [{ role: 'user', content: 'Utilise OpenAI pour me résumer ce document' }];
  // 1er
  detectSelfRedundancy({ name: 'execute_tool', input: { key: 'openai_chat_completion', args: { prompt: 'Q1', maxTokens: 50 } } }, ctx, conv);
  // 2e — même pattern oui/non, mais user explicite
  const r = detectSelfRedundancy(
    { name: 'execute_tool', input: { key: 'openai_chat_completion', args: { prompt: 'oui/non valide ?', maxTokens: 5 } } },
    ctx, conv
  );
  assert.strictEqual(r.blocked, false);
});

test('2e appel avec prompt long et tokens élevés : autorisé (vrai use case)', () => {
  const ctx = makeCtx();
  const conv = [{ role: 'user', content: 'autre chose' }];
  detectSelfRedundancy({ name: 'execute_tool', input: { key: 'openai_chat_completion', args: { prompt: 'Q1', maxTokens: 50 } } }, ctx, conv);
  // 2e — prompt long et 2000 tokens demandés → use case réel
  const longPrompt = 'Rédige un courrier formel détaillé '.repeat(40);
  const r = detectSelfRedundancy(
    { name: 'execute_tool', input: { key: 'openai_chat_completion', args: { prompt: longPrompt, maxTokens: 2000 } } },
    ctx, conv
  );
  assert.strictEqual(r.blocked, false);
});

test('détection : pattern "dict Python littéral"', () => {
  const ctx = makeCtx();
  const conv = [{ role: 'user', content: 'génère' }];
  detectSelfRedundancy({ name: 'execute_tool', input: { key: 'openai_chat_completion', args: { prompt: 'q1', maxTokens: 50 } } }, ctx, conv);
  const r = detectSelfRedundancy(
    {
      name: 'execute_tool',
      input: {
        key: 'openai_chat_completion',
        args: {
          system: 'Tu réponds uniquement avec du code Python exécutable.',
          prompt: 'Crée un dict Python littéral nommé DATA',
          maxTokens: 500, // > 200, mais le pattern attrape
        },
      },
    },
    ctx, conv
  );
  assert.strictEqual(r.blocked, true);
});

test('détection : pattern "est-elle cohérente ?"', () => {
  const ctx = makeCtx();
  const conv = [{ role: 'user', content: 'lettre' }];
  detectSelfRedundancy({ name: 'execute_tool', input: { key: 'openai_chat_completion', args: { prompt: 'q1', maxTokens: 50 } } }, ctx, conv);
  const r = detectSelfRedundancy(
    {
      name: 'execute_tool',
      input: { key: 'openai_chat_completion', args: { prompt: 'Cette formule est-elle cohérente ?', maxTokens: 5 } },
    },
    ctx, conv
  );
  assert.strictEqual(r.blocked, true);
});

test('tool non-LLM (web_search) ne déclenche jamais le garde-fou', () => {
  const ctx = makeCtx();
  ctx._llmChatCallCount = 5; // simule un état où des llm-chat ont été appelés
  const r = detectSelfRedundancy({ name: 'web_search', input: { query: 'docx python' } }, ctx, []);
  assert.strictEqual(r.blocked, false);
});

test('execute_tool avec key non-LLM (ex: slack_send_message) : pas bloqué', () => {
  const ctx = makeCtx();
  const r = detectSelfRedundancy(
    { name: 'execute_tool', input: { key: 'slack_send_message', args: { channel: '#ok', text: 'salut' } } },
    ctx, []
  );
  assert.strictEqual(r.blocked, false);
});

test('resetLlmChatCounter remet à zéro', () => {
  const ctx = { _llmChatCallCount: 10 };
  resetLlmChatCounter(ctx);
  assert.strictEqual(ctx._llmChatCallCount, 0);
});

test('buildBlockedResult retourne un tool_result pédagogique', () => {
  const r = buildBlockedResult('execute_tool', 'reason text');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, 'self_redundancy_blocked');
  assert.strictEqual(r.message, 'reason text');
  assert.ok(r.hint.includes('Réponds toi-même'));
});

test('LLM_CHAT_TOOLS contient les principaux providers', () => {
  assert.ok(LLM_CHAT_TOOLS.has('openai_chat_completion'));
  assert.ok(LLM_CHAT_TOOLS.has('anthropic_chat'));
  assert.ok(LLM_CHAT_TOOLS.has('anthropic_messages'));
});

test('scénario complet : 3 appels consécutifs, le 2e et 3e sont bloqués', () => {
  const ctx = makeCtx();
  const conv = [{ role: 'user', content: 'travaille sur un docx' }];

  // 1er : autorisé
  let r = detectSelfRedundancy(
    { name: 'execute_tool', input: { key: 'openai_chat_completion', args: { prompt: 'génère du contenu long pour la lettre', maxTokens: 800 } } },
    ctx, conv
  );
  assert.strictEqual(r.blocked, false);

  // 2e : micro-question → bloquée
  r = detectSelfRedundancy(
    { name: 'execute_tool', input: { key: 'openai_chat_completion', args: { prompt: 'oui/non ?', maxTokens: 5 } } },
    ctx, conv
  );
  assert.strictEqual(r.blocked, true);

  // 3e : encore micro → bloquée
  r = detectSelfRedundancy(
    { name: 'execute_tool', input: { key: 'openai_chat_completion', args: { prompt: 'Réponds uniquement par un mot', maxTokens: 5 } } },
    ctx, conv
  );
  assert.strictEqual(r.blocked, true);

  // Appel d'un autre tool (non-LLM) reset le compteur
  resetLlmChatCounter(ctx);
  // Puis 4e appel LLM-chat : redevient le "1er" → autorisé
  r = detectSelfRedundancy(
    { name: 'execute_tool', input: { key: 'openai_chat_completion', args: { prompt: 'q', maxTokens: 50 } } },
    ctx, conv
  );
  assert.strictEqual(r.blocked, false);
});
