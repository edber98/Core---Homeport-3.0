// Webhook Dispatcher — push les events Kinn aux endpoints abonnés.
//
// Workflow :
//   1. Code Kinn appelle dispatchEvent('run.completed', payload, ctx)
//   2. Dispatcher trouve tous les webhooks {workspaceId, active, events[type]}
//   3. Pour chaque match, POST le payload signé HMAC-SHA256
//   4. Retry exponentiel sur échec : 1s → 5s → 30s (3 tentatives)
//   5. Track delivery stats en DB
//
// Le dispatch est ASYNCHRONE et fire-and-forget : appeler dispatchEvent ne
// bloque jamais le code métier (run/thread/etc.). Erreurs loggées, pas levées.

const Webhook = require('../db/models/webhook.model');

const RETRY_DELAYS_MS = [1000, 5000, 30000]; // 3 tentatives total
const REQUEST_TIMEOUT_MS = 10000;
const MAX_RECENT_DELIVERIES = 50;

/**
 * Push un event à tous les webhooks abonnés du workspace.
 *
 * @param {string} eventType - ex: "run.completed", "thread.message.created"
 * @param {object} payload - données de l'event (sera sérialisé en JSON)
 * @param {object} ctx
 * @param {ObjectId|string} ctx.workspaceId - REQUIS
 * @param {ObjectId|string} [ctx.companyId]
 * @param {string} [ctx.idempotencyKey] - id unique pour permettre la dedup côté receiver
 * @returns {Promise<{dispatched: number}>}
 */
async function dispatchEvent(eventType, payload, ctx = {}) {
  const { workspaceId, companyId, idempotencyKey } = ctx;
  if (!workspaceId) {
    console.warn('[webhook-dispatcher] dispatchEvent appelé sans workspaceId, ignoré');
    return { dispatched: 0 };
  }
  if (!eventType || typeof eventType !== 'string') {
    console.warn('[webhook-dispatcher] eventType invalide:', eventType);
    return { dispatched: 0 };
  }

  let webhooks;
  try {
    webhooks = await Webhook.find({
      workspaceId,
      active: true,
      events: eventType,
    });
  } catch (e) {
    console.error('[webhook-dispatcher] DB lookup failed:', e?.message);
    return { dispatched: 0 };
  }

  // Filtrage avancé (flowId, threadId, runStatus)
  const matched = webhooks.filter(w => w.matches(eventType, payload));

  if (matched.length === 0) return { dispatched: 0 };

  // Lance les deliveries en parallèle, fire-and-forget
  for (const w of matched) {
    setImmediate(() => deliverWithRetry(w, eventType, payload, { idempotencyKey, companyId })
      .catch(e => console.error(`[webhook-dispatcher] ${w.id} delivery error:`, e?.message)));
  }

  return { dispatched: matched.length };
}

/**
 * Effectue la POST request avec retry exponentiel.
 */
async function deliverWithRetry(webhook, eventType, payload, opts = {}) {
  const envelope = {
    id: opts.idempotencyKey || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    event: eventType,
    timestamp: new Date().toISOString(),
    workspaceId: String(webhook.workspaceId),
    payload,
  };
  const bodyJson = JSON.stringify(envelope);
  const signature = webhook.signBody(bodyJson);

  let lastError = '';
  let lastStatus = 0;
  let lastDuration = 0;

  for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const start = Date.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);

      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Kinn-Webhook/1.0',
          'X-Kinn-Event': eventType,
          'X-Kinn-Delivery': envelope.id,
          'X-Kinn-Signature': signature,
          'X-Kinn-Timestamp': envelope.timestamp,
        },
        body: bodyJson,
        signal: ctrl.signal,
      }).catch(e => {
        if (e?.name === 'AbortError') throw new Error(`timeout after ${REQUEST_TIMEOUT_MS}ms`);
        throw e;
      });
      clearTimeout(timer);

      lastStatus = res.status;
      lastDuration = Date.now() - start;

      // 2xx = succès. 4xx = erreur permanente (pas de retry). 5xx = retry.
      if (res.ok) {
        await trackDelivery(webhook, eventType, {
          status: res.status, durationMs: lastDuration, error: null, attempt,
        }, true);
        return;
      }

      const body = await res.text().catch(() => '');
      lastError = `HTTP ${res.status}: ${body.slice(0, 200)}`;

      if (res.status >= 400 && res.status < 500) {
        // Erreur client (URL invalide, auth, etc.) — pas de retry
        await trackDelivery(webhook, eventType, {
          status: res.status, durationMs: lastDuration, error: lastError, attempt,
        }, false);
        return;
      }
      // 5xx : on retry
    } catch (e) {
      lastDuration = Date.now() - start;
      lastError = e?.message || String(e);
    }

    // Si on est arrivé là, on retry (sauf au dernier)
    if (attempt < RETRY_DELAYS_MS.length) {
      await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
    } else {
      // Toutes les tentatives ont échoué
      await trackDelivery(webhook, eventType, {
        status: lastStatus, durationMs: lastDuration, error: lastError, attempt,
      }, false);
    }
  }
}

/**
 * Met à jour les stats du webhook après une tentative.
 */
async function trackDelivery(webhook, eventType, stat, success) {
  try {
    const update = {
      $set: {
        lastSentAt: new Date(),
        ...(success ? { lastSuccessAt: new Date(), lastError: '' } : { lastError: stat.error || '' }),
      },
      $inc: {
        deliveryCount: success ? 1 : 0,
        failureCount: success ? 0 : 1,
      },
      $push: {
        recentDeliveries: {
          $each: [{ ...stat, at: new Date(), event: eventType }],
          $slice: -MAX_RECENT_DELIVERIES,
        },
      },
    };
    await Webhook.updateOne({ _id: webhook._id }, update);
  } catch (e) {
    console.error('[webhook-dispatcher] trackDelivery failed:', e?.message);
  }
}

/**
 * Push direct à un webhook spécifique (bypass matching). Utilisé par
 * l'endpoint /webhooks/:id/test pour vérifier que le receiver répond.
 *
 * @param {object} webhook - document Webhook (Mongoose)
 * @param {string} eventType - ex: "webhook.test"
 * @param {object} payload
 * @returns {Promise<void>}
 */
async function deliverDirect(webhook, eventType, payload) {
  return deliverWithRetry(webhook, eventType, payload, {});
}

module.exports = { dispatchEvent, deliverDirect };
