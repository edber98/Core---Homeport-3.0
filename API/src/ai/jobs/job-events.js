// Lightweight in-memory pub/sub for AiJob events (side events, permission
// requests, state transitions). Consumed by SSE endpoints.
//
// THREAD EVENTS — niveau supérieur :
//   Chaque emitThreadEvent fait 3 choses :
//     1. Incrémente AiThread.eventSeq (atomic Mongo $inc → seq monotone)
//     2. Persiste l'event dans AiThreadEvent (TTL 1h) pour replay au reconnect
//     3. Émet sur l'EventEmitter local pour les subscribers SSE actifs
//
//   Le frontend connecté reçoit l'event live + son seq. Au reconnect (perte de
//   connexion), il envoie Last-Event-ID: <lastSeq> → backend rejoue tous les
//   events manqués depuis AiThreadEvent. Plus de polling, plus de refetch.
//
// JOB EVENTS — niveau interne :
//   Pas de seq ni de persistence (events transitoires). Utilisés pour la
//   communication parent ↔ subagent (permissions, ask_user) qui s'auto-résout
//   en quelques secondes au sein du process.
//
// Quand AGENT_USE_QUEUE=1 + bee-queue, on garde l'emitter local pour les
// subscribers attachés à *ce* process ; le fan-out cross-process passera plus
// tard par Redis pub/sub (TODO).

const { EventEmitter } = require('events');

const _emitter = new EventEmitter();
_emitter.setMaxListeners(0);

function _key(jobId) {
  return `job:${jobId}`;
}
function _threadKey(threadId) {
  return `thread:${threadId}`;
}

function emitJobEvent(jobId, event) {
  _emitter.emit(_key(jobId), event);
}

/**
 * Emit un event SSE sur un thread. Persisté avec seq monotone pour replay.
 *
 * Le seq est ajouté automatiquement à l'event avant émission : tout subscriber
 * reçoit `{ ...event, seq, threadId, emittedAt }`.
 *
 * La persistence (DB write) est best-effort et non-bloquante : on émet
 * immédiatement aux subscribers actifs, et le write s'exécute en parallèle.
 * Si le write échoue (DB indisponible), l'event reste vivant pour la session
 * en cours mais ne pourra pas être replayé.
 */
/**
 * Si l'event référence un messageId mais ne contient pas le message complet,
 * on hydrate. Évite au frontend de refetch /threads/:id à chaque event.
 *
 * Pour les events "kind only" sans messageId (legacy), on ne peut pas hydrater
 * → ils restent en mode "notification, refetch" pour rétro-compat. À migrer
 * progressivement vers le pattern messageId+message complet.
 */
async function _hydrateMessageEvent(event) {
  if (!event || typeof event !== 'object') return event;
  const type = event.type;
  if (type !== 'ai.message.created' && type !== 'ai.message.updated') return event;
  if (event.message) return event; // déjà hydraté
  if (!event.messageId) return event; // pas hydratable
  try {
    const AiMessage = require('../../db/models/ai-message.model');
    const msg = await AiMessage.findById(event.messageId).lean();
    if (!msg) return event;
    return { ...event, message: msg };
  } catch {
    return event;
  }
}

// Queue par thread : sérialise les emissions pour garantir l'ordre des seq.
// Sans ça, 2 send() rapprochés peuvent résoudre en ordre inverse (network race
// sur le $inc Mongo) → frontend reçoit done avant ai.message.created → message
// blank après le stream.
const _threadEmitQueue = new Map(); // threadKey → Promise (chaîne)

function emitThreadEvent(threadId, event) {
  if (!threadId) return Promise.resolve();
  const AiThread = require('../../db/models/ai-thread.model');
  const AiThreadEvent = require('../../db/models/ai-thread-event.model');

  const tKey = String(threadId);
  const prev = _threadEmitQueue.get(tKey) || Promise.resolve();

  // Chaîne : chaque emit attend la fin du précédent → ordre garanti.
  const next = prev.then(async () => {
    try {
      const updated = await AiThread.findByIdAndUpdate(
        threadId,
        { $inc: { eventSeq: 1 } },
        { new: true, projection: 'eventSeq' }
      ).lean();
      if (!updated) return;
      const seq = updated.eventSeq;
      // Auto-hydrate : ai.message.created/updated avec messageId → inclut le
      // AiMessage complet pour que le frontend l'applique direct sans refetch.
      const hydrated = await _hydrateMessageEvent(event);
      const enriched = {
        ...hydrated,
        seq,
        threadId: tKey,
        emittedAt: new Date().toISOString(),
      };
      // 1. Émet aux subscribers actifs (instantané)
      _emitter.emit(_threadKey(threadId), enriched);
      // 2. Persiste pour replay (non-bloquant côté caller, mais on await ici
      //    pour garder la chaîne propre — si écriture lente, ça ralentit
      //    seulement les emits du même thread, pas les autres).
      await AiThreadEvent.create({
        threadId,
        seq,
        type: event.type || 'unknown',
        payload: hydrated,
        jobId: event.jobId || event._jobId || null,
      }).catch((e) => {
        console.warn('[thread-events] persist failed:', e?.message);
      });
    } catch (e) {
      // Si l'increment échoue (DB down), on émet sans seq pour ne pas casser
      // les subscribers actifs. Replay impossible mais live continue.
      console.warn('[thread-events] seq increment failed:', e?.message);
      _emitter.emit(_threadKey(threadId), {
        ...event,
        threadId: tKey,
        emittedAt: new Date().toISOString(),
      });
    }
  });

  // Met à jour la queue pour ce thread.
  _threadEmitQueue.set(tKey, next);
  // Cleanup : si la queue devient une chaîne très longue, on garde la
  // dernière promesse uniquement (les anciennes sont déjà settled).
  next.finally(() => {
    if (_threadEmitQueue.get(tKey) === next) _threadEmitQueue.delete(tKey);
  });

  return next;
}

function onThreadEvent(threadId, callback) {
  const key = _threadKey(threadId);
  _emitter.on(key, callback);
  return () => _emitter.off(key, callback);
}

/**
 * Récupère les events manqués d'un thread depuis un seq donné (Last-Event-ID).
 * Utilisé par le SSE master au reconnect pour replay.
 *
 * @param {string|ObjectId} threadId
 * @param {number} sinceSeq - dernier seq vu par le client (inclus = pas re-replayé)
 * @param {number} [limit=500] - garde-fou contre les replays massifs
 * @returns {Promise<Array>} events ordonnés par seq croissant
 */
async function getThreadEventsSince(threadId, sinceSeq, limit = 500) {
  if (!threadId) return [];
  const AiThreadEvent = require('../../db/models/ai-thread-event.model');
  const docs = await AiThreadEvent.find(
    { threadId, seq: { $gt: Number(sinceSeq) || 0 } },
    'seq type payload jobId createdAt'
  )
    .sort({ seq: 1 })
    .limit(limit)
    .lean();
  return docs.map(d => ({
    ...d.payload,
    seq: d.seq,
    type: d.type,
    threadId: String(threadId),
    emittedAt: d.createdAt?.toISOString?.() || null,
    jobId: d.jobId || undefined,
  }));
}

/**
 * Subscribe to a job's events. Returns an unsubscribe function.
 * @param {string} jobId
 * @param {function} callback
 */
function onJobEvent(jobId, callback) {
  const key = _key(jobId);
  _emitter.on(key, callback);
  return () => _emitter.off(key, callback);
}

/**
 * Await a specific permission-request resolution.
 * @param {string} jobId
 * @param {string} requestId
 * @param {number} [timeoutMs=300000]
 * @returns {Promise<'allow'|'deny'>}
 */
function waitForPermission(jobId, requestId, timeoutMs = 300000, opts = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const off = onJobEvent(jobId, (ev) => {
      if (ev?.type !== 'permission.resolved') return;
      if (ev.requestId !== requestId) return;
      if (settled) return;
      settled = true;
      off();
      clearTimeout(timer);
      resolve(ev.decision === 'allow' ? 'allow' : 'deny');
    });
    const timer = setTimeout(async () => {
      if (settled) return;
      settled = true;
      off();
      // ── Marque la card comme EXPIRED (au lieu de juste résoudre 'deny'
      //    silencieusement → l'user voyait la card en pending même après
      //    timeout et son clic était ignoré).
      // Met à jour le AiMessage permissionRequest.answer = 'expired' +
      // émet un event ai.permission.expired pour que la UI affiche l'état.
      try {
        const threadId = opts?.threadId;
        if (threadId) {
          const AiMessage = require('../../db/models/ai-message.model');
          const upd = await AiMessage.findOneAndUpdate(
            {
              threadId,
              'metadata.kind': 'permission_request',
              'metadata.permissionRequest.requestId': requestId,
              'metadata.permissionRequest.answer': { $exists: false },
            },
            {
              $set: {
                'metadata.permissionRequest.answer': 'expired',
                'metadata.permissionRequest.answeredAt': new Date().toISOString(),
              },
            },
            { new: true }
          ).lean();
          if (upd) {
            emitThreadEvent(String(threadId), {
              type: 'ai.message.updated',
              kind: 'permission_request',
              messageId: String(upd._id),
            });
          }
        }
      } catch (e) {
        console.warn('[waitForPermission] expired update failed:', e?.message);
      }
      resolve('deny');
    }, timeoutMs);
  });
}

/**
 * Await a specific plan-approval resolution.
 * @param {string} jobId
 * @param {string} requestId
 * @param {number} [timeoutMs=600000]
 * @returns {Promise<{decision:'approve'|'reject'|'modify', approvedSteps?:string[], modifiedSteps?:any[]}>}
 */
function waitForPlanApproval(jobId, requestId, timeoutMs = 600000) {
  return new Promise((resolve) => {
    let settled = false;
    const off = onJobEvent(jobId, (ev) => {
      if (ev?.type !== 'plan.resolved') return;
      if (ev.requestId !== requestId) return;
      if (settled) return;
      settled = true;
      off();
      clearTimeout(timer);
      const dec = ev.decision === 'approve' || ev.decision === 'modify' ? ev.decision : 'reject';
      resolve({
        decision: dec,
        approvedSteps: ev.approvedSteps || [],
        modifiedSteps: ev.modifiedSteps || null,
        missingInfoAnswers: ev.missingInfoAnswers || {},
      });
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      off();
      resolve({ decision: 'reject', approvedSteps: [], modifiedSteps: null, missingInfoAnswers: {} });
    }, timeoutMs);
  });
}

/**
 * Wait for a subagent permission request to be resolved by the parent job.
 *
 * The parent receives a `subagent.permission.request` event (emitted via
 * emitJobEvent on parentJobId). It can resolve it two ways :
 *  1. Directly : emit `subagent.permission.granted` { requestId, decision }
 *     → the child is unblocked with that decision.
 *  2. Escalate : relay to the user via its own ask_user / permission flow.
 *     When the user answers, the parent emits `subagent.permission.granted`.
 *
 * This helper never emits `ai.permission.request` to the thread SSE directly —
 * it's the parent's responsibility if it chooses to escalate.
 *
 * @param {string} parentJobId
 * @param {string} requestId
 * @param {number} [timeoutMs=300000]
 * @returns {Promise<'allow'|'deny'>}
 */
function waitForPermissionFromParent(parentJobId, requestId, timeoutMs = 300000) {
  return new Promise((resolve) => {
    let settled = false;
    const off = onJobEvent(parentJobId, (ev) => {
      if (ev?.type !== 'subagent.permission.granted') return;
      if (ev.requestId !== requestId) return;
      if (settled) return;
      settled = true;
      off();
      clearTimeout(timer);
      resolve(ev.decision === 'allow' ? 'allow' : 'deny');
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      off();
      resolve('deny'); // timeout → deny (conservative)
    }, timeoutMs);
  });
}

/**
 * Wait for a subagent ask_user request to be answered by the parent job.
 * Parent emits `subagent.ask_user.answered` { requestId, answer, source }.
 *
 * @param {string} parentJobId
 * @param {string} requestId
 * @param {number} [timeoutMs=300000]
 * @returns {Promise<{answer:any, source:'parent_auto'|'user_via_parent'|'timeout'}>}
 */
function waitForAskUserFromParent(parentJobId, requestId, timeoutMs = 300000) {
  return new Promise((resolve) => {
    let settled = false;
    const off = onJobEvent(parentJobId, (ev) => {
      if (ev?.type !== 'subagent.ask_user.answered') return;
      if (ev.requestId !== requestId) return;
      if (settled) return;
      settled = true;
      off();
      clearTimeout(timer);
      resolve({ answer: ev.answer, source: ev.source || 'parent_auto' });
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      off();
      resolve({ answer: null, source: 'timeout' });
    }, timeoutMs);
  });
}

module.exports = {
  emitJobEvent,
  onJobEvent,
  emitThreadEvent,
  onThreadEvent,
  getThreadEventsSince,
  waitForPermission,
  waitForPlanApproval,
  waitForPermissionFromParent,
  waitForAskUserFromParent,
};
