// Radar — bus d'événements temps réel (même pattern que panel-credits/bus).
//
// Tout ce qui bouge dans le radar émet ici ; la route SSE
// GET /workspaces/:wsId/radar/stream relaie aux navigateurs du workspace.
// Types : mission.created | mission.updated | mission.stream | signal.created |
//         signal.updated | board.changed | notification.created
//
// Best-effort : aucune émission ne doit jamais faire échouer l'appelant.

const { EventEmitter } = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(200); // 1 listener par onglet ouvert

function emitRadarEvent(workspaceId, type, payload = {}) {
  try {
    bus.emit('radar', { workspaceId: String(workspaceId), type, payload, at: new Date().toISOString() });
  } catch { /* jamais bloquant */ }
}

/**
 * Émetteur throttlé pour le streaming du texte d'une mission : accumule les
 * chunks et n'émet au plus qu'une fois par intervalle (texte complet à date —
 * le client remplace, pas d'assemblage fragile côté navigateur).
 */
function createMissionStreamEmitter(workspaceId, missionId, { intervalMs = 800 } = {}) {
  let buffer = '';
  let timer = null;
  const flush = () => {
    timer = null;
    if (!buffer) return;
    emitRadarEvent(workspaceId, 'mission.stream', { missionId, text: buffer });
  };
  return {
    push(fullText) {
      buffer = fullText;
      if (!timer) timer = setTimeout(flush, intervalMs);
    },
    end() {
      if (timer) { clearTimeout(timer); timer = null; }
      flush();
    },
  };
}

module.exports = { bus, emitRadarEvent, createMissionStreamEmitter };
