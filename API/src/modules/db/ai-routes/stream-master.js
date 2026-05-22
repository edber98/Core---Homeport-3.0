// SSE master — 1 seul stream par thread, qui remplace le couple :
//   - POST /threads/:id/messages (SSE de la requête en cours)
//   - GET  /threads/:id/stream    (SSE live des events thread)
//
// Architecture cible :
//   GET /api/ai/threads/:threadId/live    ← 1 connexion persistante côté frontend
//
// Events natifs SSE :
//   id: <seq>\n          ← le client renvoie automatiquement via Last-Event-ID
//   data: <json>\n\n     ← payload enrichi (seq, threadId, emittedAt, ...données complètes)
//
// REPLAY :
//   Au reconnect, le frontend envoie le header `Last-Event-ID: 1234`.
//   Backend : `getThreadEventsSince(threadId, 1234)` → push les events manqués,
//             puis bascule sur le live stream. Aucune donnée perdue.
//
// HEARTBEAT :
//   `: keepalive\n\n` toutes les 15s pour maintenir la connexion (proxies / load-balancers).
//
// FAN-OUT :
//   `onThreadEvent` est en-mémoire (EventEmitter). Mono-process pour l'instant ;
//   cross-process Redis pub/sub à brancher dans une itération suivante si besoin.

const { findThread } = require('./_shared');
const { onThreadEvent, getThreadEventsSince } = require('../../../ai/jobs/job-events');
const { requireThreadAccess } = require('../../../ai/access/thread-access');

const HEARTBEAT_INTERVAL_MS = 15_000;
const REPLAY_LIMIT = 500; // garde-fou contre les replays massifs

function _writeSseEvent(res, event) {
  // event est l'objet emit avec seq déjà ajouté par emitThreadEvent.
  // Format SSE standard : id: <seq> + data: <json>
  if (event?.seq != null) {
    try { res.write(`id: ${event.seq}\n`); } catch { return false; }
  }
  if (event?.type) {
    try { res.write(`event: ${event.type}\n`); } catch { return false; }
  }
  try {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    if (typeof res.flush === 'function') res.flush();
    return true;
  } catch {
    return false;
  }
}

module.exports = function registerStreamMasterRoutes(r) {
  /**
   * SSE master — 1 stream par thread.
   *
   * Headers entrants :
   *   - Last-Event-ID : seq du dernier event reçu par le client (pour replay)
   *
   * Sortie : flux SSE permanent jusqu'à fermeture cliente ou serveur.
   */
  r.get('/ai/threads/:threadId/live', requireThreadAccess('view'), async (req, res) => {
    const thread = req.aiThread;
    const threadKey = String(thread._id);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // désactive le buffering nginx
    if (res.socket) res.socket.setNoDelay(true);
    res.flushHeaders();

    // ── 1. Replay des events manqués si Last-Event-ID présent ────────
    const lastEventId = req.headers['last-event-id'] || req.query.lastEventId;
    const sinceSeq = Number(lastEventId) || 0;
    if (sinceSeq > 0) {
      try {
        const missed = await getThreadEventsSince(thread._id, sinceSeq, REPLAY_LIMIT);
        if (missed.length) {
          console.log(`[sse-master] replay ${missed.length} events for thread=${threadKey} since seq=${sinceSeq}`);
          for (const ev of missed) {
            if (!_writeSseEvent(res, ev)) return; // client déjà déconnecté
          }
          // Si on atteint exactement REPLAY_LIMIT, prévient le client qu'il manque
          // peut-être encore des events plus anciens → il devra recharger.
          if (missed.length === REPLAY_LIMIT) {
            _writeSseEvent(res, {
              type: 'replay.truncated',
              seq: missed[missed.length - 1].seq,
              hint: `Replay tronqué à ${REPLAY_LIMIT} events. Reload thread pour récupérer le state complet.`,
            });
          }
        }
      } catch (e) {
        console.warn(`[sse-master] replay failed for thread=${threadKey}:`, e?.message);
      }
    }

    // ── 2. Marque l'ouverture du stream ──────────────────────────────
    _writeSseEvent(res, {
      type: 'stream.ready',
      threadId: threadKey,
      emittedAt: new Date().toISOString(),
    });

    // ── 3. Subscribe au live stream ──────────────────────────────────
    const off = onThreadEvent(threadKey, (ev) => {
      _writeSseEvent(res, ev);
    });

    // ── 4. Heartbeat (anti-timeout proxy) ────────────────────────────
    const heartbeat = setInterval(() => {
      try { res.write(`: keepalive\n\n`); } catch {}
    }, HEARTBEAT_INTERVAL_MS);

    // ── 5. Cleanup au close ──────────────────────────────────────────
    const cleanup = () => {
      clearInterval(heartbeat);
      try { off(); } catch {}
      try { res.end(); } catch {}
    };
    req.on('close', cleanup);
    res.on('close', cleanup);
  });
};
