// cjs-wrapper.js — Adaptateur fonctions de haut-niveau pour agent-runner.js
// ET le nouveau agent-harness.js (chat / project / workflow modes).
//
// Expose :
//   - debitAnthropicTurn      : legacy Anthropic specific (gardé pour rétro-compat)
//   - debitTurn               : générique provider-agnostic (openai, anthropic, ...)
//   - debitEmbeddings, debitWhisper : usages dédiés
//   - checkBeforeCall         : pré-check obligatoire avant un call LLM
//                                (vérifie modèle dans catalog + solde suffisant).
//                                Throw avec err.code 'unknown_model' /
//                                'model_not_enabled_for_app' / 'insufficient_credits'.
//   - bus                     : EventEmitter local pour notifier le SSE endpoint
//                                à chaque débit réussi → push temps réel au badge.

const crypto = require('crypto');
const { EventEmitter } = require('events');
const panelCredits = require('./index.js');

/**
 * Normalise le nom du provider du harness LLM vers la clé du catalog Panel.
 * Le harness expose des providers internes ('openai-responses', 'openai',
 * 'claude', 'vllm'…) mais le catalog LlmModel utilise une clé canonique
 * `${provider}:${model}` avec provider ∈ {openai, anthropic, ...}.
 *
 * Sans cette normalisation, gpt-5.2 (provider interne 'openai-responses')
 * cherchait 'openai-responses:gpt-5.2' dans le catalog → unknown_model →
 * le débit échouait silencieusement et le compteur ne descendait jamais.
 */
function normalizeProvider(p) {
  const s = String(p || 'openai').toLowerCase();
  if (s === 'openai-responses' || s === 'openai-chat' || s === 'openai-compat' || s === 'openai-compatible') return 'openai';
  if (s === 'claude') return 'anthropic';
  // vllm/ollama/lmstudio/etc : on garde tel quel (catalog peut les référencer)
  return s;
}

/**
 * EventEmitter local au pod kinn-app. Émet `debit` après chaque débit réussi
 * (et `check_failed` quand le pré-check refuse). Le endpoint SSE
 * `/api/me/credits/stream` filtre par userId pour push uniquement au bon client.
 *
 * Pas de Redis / pub-sub : 1 seul pod kinn-app par client → in-memory suffit.
 * setMaxListeners haut (50) pour supporter plusieurs onglets ouverts.
 */
const bus = new EventEmitter();
bus.setMaxListeners(50);

/**
 * Débit générique pour UN tour de LLM, quel que soit le provider.
 *
 * En entrée, usage peut venir de plusieurs providers (Anthropic / OpenAI /
 * vLLM) — on normalise. La fonction throw avec err.code propre si :
 *   - 'unknown_model' : le modèle n'est pas dans le catalog LlmModel du Panel
 *   - 'model_not_enabled_for_app' : modèle existe mais pas activé pour l'app
 *   - 'insufficient_credits' : solde wallet ou quota user dépassé
 * → l'appelant DOIT propager au stream pour bloquer l'usage.
 *
 * Les erreurs réseau / fail-open / mock retournent { credits:0, mocked:true }
 * SANS throw (best-effort billing en cas d'incident Panel).
 *
 * À chaque débit RÉUSSI non-mocké, émet `bus.emit('debit', {...})` pour le SSE.
 */
async function debitTurn({ userId, conversationId, iter, provider, model, usage, context }) {
  const prov = normalizeProvider(provider);
  // Idempotency key déterministe pour replay safety :
  //   ${provider}:${conversationId}:${iter} — si un même tour est replay'd
  //   (retry réseau, etc), Panel renvoie le résultat précédent sans re-débit.
  const idempotencyKey = `${prov}:${conversationId || 'noconv'}:${iter || 0}`;

  // Normalisation usage : Anthropic = input_tokens/output_tokens/cache_read_input_tokens
  // OpenAI Responses = input/output/cached. On accepte les deux formats.
  const inputTokens = Number(usage?.input_tokens ?? usage?.input ?? usage?.prompt_tokens ?? 0);
  const outputTokens = Number(usage?.output_tokens ?? usage?.output ?? usage?.completion_tokens ?? 0);
  const cachedTokens = Number(usage?.cache_read_input_tokens ?? usage?.cached ?? usage?.input_tokens_details?.cached_tokens ?? 0);

  try {
    const r = await panelCredits.debit({
      userId, idempotencyKey,
      input: { provider: prov, model, inputTokens, outputTokens, cachedTokens },
      context: { ...(context || {}), conversationId, iter }
    });
    const result = {
      credits: r?.debited?.credits || 0,
      costEur: r?.debited?.costEur || 0,
      balance: r?.balance || null,
      mocked: !!r?.mocked,
      idempotent: !!r?.idempotent,
      ledgerId: r?.ledgerId || null
    };
    // Émission temps-réel uniquement pour les débits réels non-replay.
    if (!result.mocked && !result.idempotent && userId) {
      try {
        bus.emit('debit', {
          userId: String(userId),
          credits: result.credits,
          costEur: result.costEur,
          balance: result.balance,
          model, provider: prov,
          at: new Date().toISOString()
        });
      } catch (e) { /* never crash on emit */ }
    }
    return result;
  } catch (e) {
    // 402 = insufficient_credits | 403 = quota user / hard_cap / app disabled
    // 400 = unknown_model / model_not_enabled_for_app / bad_application_id
    const status = e?.status || 0;
    const bodyCode = e?.body?.error?.code;
    if (status === 402 || status === 403 || bodyCode === 'unknown_model' || bodyCode === 'model_not_enabled_for_app') {
      const err = new Error(bodyCode || e?.message || 'credit_error');
      err.code = bodyCode || 'credit_error';
      err.balance = e?.body?.error?.balance;
      err.payload = e?.body?.error || null;
      err.status = status;
      try { bus.emit('check_failed', { userId: String(userId || ''), code: err.code, model, provider: prov }); } catch {}
      throw err;
    }
    // Erreur réseau / 5xx : best-effort, on log et continue (pas de blocage user)
    console.warn(`[panel-credits-cjs] debitTurn (${prov}/${model}) failed silently:`, e?.message || e);
    return { credits: 0, costEur: 0, balance: null, error: e?.message };
  }
}

// Conservé pour rétro-compatibilité (agent-runner.js legacy).
async function debitAnthropicTurn({ userId, conversationId, iter, model, usage }) {
  return debitTurn({ userId, conversationId, iter, provider: 'anthropic', model, usage });
}

/**
 * Pré-check OBLIGATOIRE avant de lancer un appel LLM. Vérifie côté Panel :
 *   - Le modèle existe dans LlmModel (catalogue) ET est activé pour l'app
 *   - Le wallet a un solde suffisant (estimation grossière basée sur 1000 tokens)
 *
 * Throw avec err.code clair si refus → l'appelant doit STOP avant d'appeler
 * l'API LLM (pas de gaspillage de tokens externes si on ne peut pas facturer).
 *
 * Retourne { ok: true, sufficient: true, estimated: {credits, costEur} } si OK.
 */
async function checkBeforeCall({ userId, provider, model, estimatedInputTokens = 1000, estimatedOutputTokens = 500 }) {
  // shouldEnforce() = crédits activés (déployé avec crédits). Si non activé
  // (dev/local) → on laisse passer. Si activé mais NON relié, checkCredits()
  // lèvera panel_not_configured → bloqué par le fail-closed ci-dessous.
  if (!panelCredits.shouldEnforce()) {
    return { ok: true, mocked: true, sufficient: true };
  }
  try {
    const r = await panelCredits.checkCredits({
      userId,
      input: {
        provider: normalizeProvider(provider),
        model,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens
      }
    });
    if (r?.skipped) return { ok: true, sufficient: true, reason: r.reason || 'credits_disabled' };
    if (r?.sufficient === false) {
      const err = new Error('insufficient_credits');
      err.code = 'insufficient_credits';
      err.balance = r.balance;
      err.estimated = r.estimated;
      throw err;
    }
    return { ok: true, sufficient: true, estimated: r?.estimated, balance: r?.balance };
  } catch (e) {
    const status = e?.status || 0;
    const bodyCode = e?.body?.error?.code || e?.code;
    // Le Panel encapsule parfois le vrai code dans message (ancien handleError
    // qui renvoyait internal_error). On regarde aussi le message en fallback.
    const bodyMsg = e?.body?.error?.message || e?.message || '';
    const effectiveCode = bodyCode
      || (/model_not_enabled_for_app/.test(bodyMsg) ? 'model_not_enabled_for_app'
        : /unknown_model/.test(bodyMsg) ? 'unknown_model'
        : /insufficient_credits/.test(bodyMsg) ? 'insufficient_credits'
        : null);

    if (effectiveCode === 'unknown_model' || effectiveCode === 'model_not_enabled_for_app') {
      const err = new Error(effectiveCode);
      err.code = effectiveCode;
      err.status = status || 403;
      err.payload = e?.body?.error || null;
      try { bus.emit('check_failed', { userId: String(userId || ''), code: err.code, model, provider }); } catch {}
      throw err;
    }
    if (effectiveCode === 'insufficient_credits' || status === 402) {
      const err = new Error('insufficient_credits');
      err.code = 'insufficient_credits';
      err.balance = e?.body?.error?.balance;
      err.status = 402;
      throw err;
    }
    // ─── FAIL-CLOSED (sécurité) ───────────────────────────────────────────
    // Réseau / 5xx / erreur inconnue : on NE LAISSE PAS passer. Si le Panel
    // ne peut pas confirmer que le client peut payer, on BLOQUE l'appel IA.
    // Sinon un client consomme de l'IA (coût réel pour nous) sans qu'on
    // puisse facturer → perte d'argent. Le chat affiche un message d'erreur.
    console.error(`[panel-credits-cjs] checkBeforeCall BLOCKING (fail-closed): ${e?.message || e}`);
    const err = new Error('credits_unavailable');
    err.code = 'credits_unavailable';
    err.status = status || 503;
    try { bus.emit('check_failed', { userId: String(userId || ''), code: 'credits_unavailable', model, provider }); } catch {}
    throw err;
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
function shouldEnforce() { return panelCredits.shouldEnforce(); }

module.exports = {
  getHelper: () => panelCredits,
  debitAnthropicTurn,
  debitTurn,
  debitEmbeddings,
  debitWhisper,
  checkBeforeCall,
  isEnabled,
  shouldEnforce,
  getConfig: () => panelCredits.getConfig(),
  bus,        // EventEmitter — utilisé par routes/me-credits-stream.js
};
