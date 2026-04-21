// Helper global : est-ce que AI_DEBUG est activé ?
// En JS, la string "0" / "false" est truthy → on doit comparer explicitement.
// Evalué une seule fois au démarrage (performance).
const _v = String(process.env.AI_DEBUG || '').trim().toLowerCase();
const AI_DEBUG = _v === '1' || _v === 'true' || _v === 'yes' || _v === 'on';

function isDebug() {
  return AI_DEBUG;
}

module.exports = { AI_DEBUG, isDebug };
