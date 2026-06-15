// Radar — board server-driven.
//
// Le board n'est pas un document : c'est la vue calculée des cards ouvertes,
// groupées par section et triées par priorité. Le superviseur le fait évoluer
// card par card (add_card / close_card) ; il ne le régénère jamais entièrement.
//
// La boucle de validation : l'utilisateur répond à une card (valider /
// modifier / refuser / répondre) → la card change d'état et un RadarWakeup
// immédiat ramène le superviseur, qui décide de la suite (exécuter, ajuster,
// apprendre de la modification — phase 6).

const VALID_ACTIONS = new Set(['validate', 'modify', 'dismiss', 'answer']);
const ACTION_STATE = { validate: 'validated', modify: 'modified', dismiss: 'dismissed', answer: 'answered' };

// Regroupement par NATURE de la card (stable dans le temps), pas par le
// libellé de section que le superviseur a figé à la création. Évite les vieux
// digests bloqués sous « Aujourd'hui ».
const SECTION_OF = {
  action_proposal: 'À valider',
  question: 'À valider',
  alert: 'Alertes',
  briefing: 'Informations',
  digest: 'Informations',
  mission_status: 'Informations',
};
const SECTION_ORDER = ['À valider', 'Alertes', 'Informations'];
// Les cards d'information (FYI) s'effacent seules au bout de 48 h pour ne pas
// encombrer le board ; les cards actionnables restent jusqu'à réponse.
const INFO_TTL_MS = 48 * 3600_000;
const INFO_TYPES = new Set(['digest', 'briefing', 'mission_status']);

/** Vue board d'un workspace : sections par nature, cards d'info auto-expirées. */
async function getBoard(workspaceId, { includeClosed = 8 } = {}) {
  const RadarCard = require('../db/models/radar-card.model');
  const now = new Date();
  // Expiration paresseuse : expiresAt dépassé OU card d'info trop ancienne
  await RadarCard.updateMany(
    { workspaceId, state: 'open', $or: [
      { expiresAt: { $lt: now } },
      { type: { $in: [...INFO_TYPES] }, createdAt: { $lt: new Date(now.getTime() - INFO_TTL_MS) } },
    ] },
    { $set: { state: 'expired' } }
  );

  const open = await RadarCard.find({ workspaceId, state: 'open' }).sort({ priority: 1, createdAt: -1 }).lean();
  const sectionsMap = new Map();
  for (const c of open) {
    const s = SECTION_OF[c.type] || 'Informations';
    if (!sectionsMap.has(s)) sectionsMap.set(s, []);
    sectionsMap.get(s).push(_publicCard(c));
  }
  const sections = SECTION_ORDER
    .filter(s => sectionsMap.has(s))
    .map(s => ({ title: s, cards: sectionsMap.get(s) }));

  const recentClosed = includeClosed
    ? (await RadarCard.find({ workspaceId, state: { $ne: 'open' } }).sort({ updatedAt: -1 }).limit(includeClosed).lean()).map(_publicCard)
    : [];

  return { generatedAt: now, sections, openCount: open.length, recentClosed };
}

function _publicCard(c) {
  return {
    id: c.id, type: c.type, section: c.section, priority: c.priority,
    title: c.title, payload: c.payload || {}, requiresResponse: !!c.requiresResponse,
    state: c.state, userResponse: c.userResponse && c.userResponse.action ? c.userResponse : undefined,
    missionId: c.missionId || undefined, closedNote: c.closedNote || undefined,
    createdAt: c.createdAt, updatedAt: c.updatedAt,
  };
}

/**
 * Réponse utilisateur à une card → état + réveil immédiat du superviseur.
 * @returns {{ ok: boolean, error?: string, card?: object }}
 */
async function respondToCard({ workspaceId, cardId, action, note, answer, modifiedPayload, userId }) {
  const RadarCard = require('../db/models/radar-card.model');
  const RadarWakeup = require('../db/models/radar-wakeup.model');
  if (!VALID_ACTIONS.has(action)) return { ok: false, error: `invalid_action: ${action}` };

  const card = await RadarCard.findOne({ id: cardId, workspaceId });
  if (!card) return { ok: false, error: 'card_not_found' };
  if (card.state !== 'open') return { ok: false, error: `card_not_open: ${card.state}` };
  if (action === 'answer' && !String(answer || '').trim()) return { ok: false, error: 'answer_required' };

  card.state = ACTION_STATE[action];
  card.userResponse = {
    action,
    note: note ? String(note).slice(0, 2000) : undefined,
    answer: answer ? String(answer).slice(0, 4000) : undefined,
    modifiedPayload: modifiedPayload || undefined,
    at: new Date(),
    userId: userId || undefined,
  };
  await card.save();

  await RadarWakeup.create({
    workspaceId,
    at: new Date(),
    reason: 'card_response',
    payload: {
      cardId: card.id, cardType: card.type, cardTitle: card.title,
      action, note: card.userResponse.note, answer: card.userResponse.answer,
      modifiedPayload: card.userResponse.modifiedPayload,
      missionId: card.missionId || undefined,
    },
  });

  require('./events').emitRadarEvent(workspaceId, 'board.changed', { cardId: card.id, action: 'responded', state: card.state });
  return { ok: true, card: _publicCard(card.toObject()) };
}

module.exports = { getBoard, respondToCard, VALID_ACTIONS };
