// cjs-wrapper.js — Adaptateur fonctions de haut-niveau pour agent-runner.js.
//
// Le helper `./index.js` est désormais en CJS (matche le projet kinn-app).
// Ce wrapper expose des helpers spécialisés (debitAnthropicTurn, etc.) qui
// gèrent idempotencyKey + gestion d'erreurs 402/403 spécifique à l'usage IA.

const crypto = require('crypto');
const panelCredits = require('./index.js');

async function debitAnthropicTurn({ userId, conversationId, iter, model, usage }) {
  const idempotencyKey = `anthropic:${conversationId || 'noconv'}:${iter || 0}:${crypto.randomBytes(4).toString('hex')}`;
  try {
    const r = await panelCredits.debit({
      userId, idempotencyKey,
      input: {
        provider: 'anthropic',
        model,
        inputTokens: usage?.input_tokens || usage?.input || 0,
        outputTokens: usage?.output_tokens || usage?.output || 0,
        cachedTokens: usage?.cache_read_input_tokens || 0
      },
      context: { conversationId, iter }
    });
    return {
      credits: r?.debited?.credits || 0,
      costEur: r?.debited?.costEur || 0,
      balance: r?.balance || null,
      mocked: !!r?.mocked,
      ledgerId: r?.ledgerId || null
    };
  } catch (e) {
    if (e?.status === 402 || e?.status === 403) {
      const err = new Error(e?.message || 'credit_error');
      err.code = e?.body?.error?.code || 'credit_error';
      err.balance = e?.body?.error?.balance;
      throw err;
    }
    console.warn('[panel-credits-cjs] debit failed (silent):', e?.message || e);
    return { credits: 0, costEur: 0, balance: null, error: e?.message };
  }
}

async function debitEmbeddings({ userId, model, usage, op }) {
  const idempotencyKey = `embed:${userId || 'sys'}:${Date.now()}:${crypto.randomBytes(4).toString('hex')}`;
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
    console.warn('[panel-credits-cjs] embedding debit failed:', e?.message);
    return { ok: false, error: e?.message };
  }
}

async function debitWhisper({ userId, model, durationSeconds }) {
  const idempotencyKey = `whisper:${userId || 'sys'}:${Date.now()}:${crypto.randomBytes(4).toString('hex')}`;
  try {
    return await panelCredits.debit({
      userId, idempotencyKey,
      input: { provider: 'openai', model: model || 'whisper-1', durationSeconds },
      context: { type: 'audio_transcription' }
    });
  } catch (e) {
    return { ok: false, error: e?.message };
  }
}

function isEnabled() { return panelCredits.isEnabled(); }

module.exports = {
  getHelper: () => panelCredits,
  debitAnthropicTurn,
  debitEmbeddings,
  debitWhisper,
  isEnabled
};
