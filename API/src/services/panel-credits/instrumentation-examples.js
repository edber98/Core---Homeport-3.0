// instrumentation-examples.js — SNIPPETS DE RÉFÉRENCE pour intégrer
// panel-credits dans ai-agent.js, ai-rag.js, server.js (whisper).
//
// ⚠️ Ce fichier est une bibliothèque de helpers utilisables directement.
// Importez-le dans le code AI pour brancher facilement la facturation.
//
// Le mode DEV STANDALONE (KINN_PANEL_CREDITS_ENABLED!=true) → tous les
// appels sont des no-op mocks. Aucune branche `if (env)` à écrire.

const { randomUUID } = require('crypto');
const panelCredits = require('./index.js');

// ─── 1. Anthropic streaming ────────────────────────────────────────────────
async function debitAnthropicTurn({ userId, conversationId, iter, model, usage }) {
  const idempotencyKey = `anthropic:${conversationId}:${iter}:${randomUUID().slice(0, 8)}`;
  try {
    const r = await panelCredits.debit({
      userId, idempotencyKey,
      input: {
        provider: 'anthropic', model,
        inputTokens: usage?.input_tokens || 0,
        outputTokens: usage?.output_tokens || 0,
        cachedTokens: usage?.cache_read_input_tokens || 0
      },
      context: { conversationId, iter }
    });
    return {
      credits: r?.debited?.credits || 0,
      costEur: r?.debited?.costEur || 0,
      balance: r?.balance || null,
      mocked: !!r?.mocked
    };
  } catch (e) {
    if (e.status === 402 || e.status === 403) {
      const err = new Error(e.message);
      err.code = e.body?.error?.code;
      err.balance = e.body?.balance;
      throw err;
    }
    console.warn('[billing] debit failed:', e?.message || e);
    return { credits: 0, costEur: 0, balance: null, error: e?.message };
  }
}

// ─── 2. OpenAI embeddings ──────────────────────────────────────────────────
async function debitEmbeddings({ userId, model, usage, op = 'embed' }) {
  const idempotencyKey = `embed:${userId || 'sys'}:${Date.now()}:${randomUUID().slice(0, 8)}`;
  try {
    return await panelCredits.debit({
      userId, idempotencyKey,
      input: {
        provider: 'openai', model,
        inputTokens: usage?.prompt_tokens || usage?.total_tokens || 0,
        outputTokens: 0
      },
      context: { op }
    });
  } catch (e) {
    console.warn('[billing] embedding debit failed:', e?.message);
    return { ok: false, error: e?.message };
  }
}

// ─── 3. Whisper audio ──────────────────────────────────────────────────────
async function debitWhisper({ userId, model, durationSeconds }) {
  const idempotencyKey = `whisper:${userId || 'sys'}:${Date.now()}:${randomUUID().slice(0, 8)}`;
  try {
    return await panelCredits.debit({
      userId, idempotencyKey,
      input: { provider: 'openai', model: model || 'whisper-1', durationSeconds },
      context: { type: 'audio_transcription' }
    });
  } catch (e) {
    console.warn('[billing] whisper debit failed:', e?.message);
    return { ok: false, error: e?.message };
  }
}

// ─── 4. Pre-check ──────────────────────────────────────────────────────────
async function preCheckAffordability({ userId, provider, model, estimatedIn, estimatedOut }) {
  try {
    const r = await panelCredits.checkCredits({
      userId,
      input: { provider, model, inputTokens: estimatedIn, outputTokens: estimatedOut }
    });
    return {
      sufficient: r?.sufficient !== false,
      estimated: r?.estimated || { credits: 0, costEur: 0 },
      balance: r?.balance || null,
      mocked: !!r?.mocked
    };
  } catch (e) {
    return { sufficient: true, error: e?.message, mocked: true };
  }
}

module.exports = {
  debitAnthropicTurn,
  debitEmbeddings,
  debitWhisper,
  preCheckAffordability
};
