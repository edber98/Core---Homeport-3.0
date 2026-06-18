// Radar — émetteur centralisé de feedback (Étage 2 du cerveau).
//
// Un seul point d'entrée pour enregistrer toute décision humaine en exemple
// d'apprentissage. Best-effort : ne casse JAMAIS le flux utilisateur si l'écriture
// échoue (l'apprentissage est un bonus, pas un chemin critique).
// Gardé par RADAR_LEARNING_ENABLED (défaut off) pour ne rien accumuler tant que la
// distillation n'est pas activée.

function learningEnabled() {
  return ['1', 'true', 'on', 'yes'].includes(String(process.env.RADAR_LEARNING_ENABLED || '').trim().toLowerCase());
}

/**
 * Enregistre un feedback. Best-effort (jamais throw).
 * @returns {Promise<object|null>} le doc créé, ou null si désactivé/erreur.
 */
async function emitFeedback({ workspaceId, userId, action, targetKind, targetId, taskType, features = {}, label, rawBefore, rawAfter } = {}) {
  if (!learningEnabled()) return null;
  if (!workspaceId || !action || !targetKind) return null;
  try {
    const RadarFeedback = require('../db/models/radar-feedback.model');
    return await RadarFeedback.create({ workspaceId, userId, action, targetKind, targetId, taskType, features, label, rawBefore, rawAfter });
  } catch (e) {
    console.error('[radar-feedback] emit failed:', e?.message);
    return null;
  }
}

/** Statistiques du dataset : volume par taskType et par action (pour l'UI supervision). */
async function feedbackStats(workspaceId) {
  const RadarFeedback = require('../db/models/radar-feedback.model');
  const [byTask, byAction, total] = await Promise.all([
    RadarFeedback.aggregate([
      { $match: { workspaceId } },
      { $group: { _id: '$taskType', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]),
    RadarFeedback.aggregate([
      { $match: { workspaceId } },
      { $group: { _id: '$action', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]),
    RadarFeedback.countDocuments({ workspaceId }),
  ]);
  return {
    total,
    byTaskType: byTask.map(b => ({ taskType: b._id || 'inconnu', count: b.n })),
    byAction: byAction.map(b => ({ action: b._id, count: b.n })),
  };
}

module.exports = { emitFeedback, feedbackStats, learningEnabled };
