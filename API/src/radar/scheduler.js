// Radar — scheduler central d'observation.
//
// Boucle tick (setInterval, même pattern que ai/jobs/resume-worker) qui
// parcourt les RadarConnector et lance les collectes dues. Multi-instance :
// claim atomique via lockedUntil (findOneAndUpdate), un connecteur n'est
// jamais collecté deux fois en parallèle.
//
// Politique par connecteur :
//   - intervalle : pollingPolicy.intervalMs sinon défaut par famille ;
//   - backoff exponentiel sur erreurs consécutives (cap ×32) ;
//   - rateLimitedUntil respecté (posé sur erreur 429/rate limit) ;
//   - quietHours [hDébut, hFin) : pas de polling dans la fenêtre, SAUF une
//     collecte complète par nuit si pollingPolicy.nightlyFull (défaut true).
//
// Démarrage opt-in : RADAR_SCHEDULER_ENABLED=1 (voir server.js).

const { collectConnector } = require('./collector');

const DEFAULT_TICK_MS = 30_000;
const LOCK_MS = 5 * 60_000;          // une collecte doit tenir en 5 min
const MAX_BACKOFF_MULTIPLIER = 32;
const RATE_LIMIT_PAUSE_MS = 15 * 60_000;
const BATCH_PER_TICK = 10;

const DEFAULT_INTERVALS_MS = {
  email: 3 * 60_000,
  communication: 10 * 60_000,
  storage: 15 * 60_000,
  productivity: 15 * 60_000,
  calendar: 30 * 60_000,
  accounting: 60 * 60_000,
  crm: 60 * 60_000,
  hr: 6 * 3600_000,
  monitoring: 5 * 60_000,
};

let _timer = null;

/** Intervalle effectif (politique connecteur > défaut famille) × backoff erreurs. Pure. */
function effectiveIntervalMs(connector) {
  const base = Number(connector.pollingPolicy?.intervalMs) || DEFAULT_INTERVALS_MS[connector.family] || 15 * 60_000;
  const errors = Number(connector.health?.consecutiveErrors) || 0;
  const multiplier = Math.min(2 ** errors, MAX_BACKOFF_MULTIPLIER);
  return base * multiplier;
}

/** now est-il dans la fenêtre [hStart, hEnd) ? (heure locale serveur ; fenêtre pouvant passer minuit). Pure. */
function isInQuietHours(now, quietHours) {
  if (!Array.isArray(quietHours) || quietHours.length !== 2) return false;
  const [start, end] = quietHours.map(Number);
  if (Number.isNaN(start) || Number.isNaN(end) || start === end) return false;
  const h = now.getHours();
  return start < end ? (h >= start && h < end) : (h >= start || h < end);
}

/** Début de la fenêtre quiet courante (pour "une collecte par nuit"). Pure. */
function quietWindowStart(now, quietHours) {
  const [start] = quietHours.map(Number);
  const d = new Date(now);
  d.setHours(start, 0, 0, 0);
  if (d > now) d.setDate(d.getDate() - 1); // fenêtre passant minuit, entamée hier
  return d;
}

/** Le connecteur doit-il être collecté maintenant ? Pure. */
function isDue(connector, now = new Date()) {
  if (!['active', 'pending', 'error'].includes(connector.status)) return false;
  if (connector.health?.rateLimitedUntil && new Date(connector.health.rateLimitedUntil) > now) return false;
  if (connector.lockedUntil && new Date(connector.lockedUntil) > now) return false;

  const quietHours = connector.pollingPolicy?.quietHours;
  if (isInQuietHours(now, quietHours)) {
    // Fenêtre calme : seulement la collecte nocturne complète, une fois par nuit
    const nightlyFull = connector.pollingPolicy?.nightlyFull !== false;
    if (!nightlyFull) return false;
    const windowStart = quietWindowStart(now, quietHours);
    return !connector.lastFullSyncAt || new Date(connector.lastFullSyncAt) < windowStart;
  }

  if (!connector.lastPollAt) return true; // baseline jamais faite
  return now.getTime() - new Date(connector.lastPollAt).getTime() >= effectiveIntervalMs(connector);
}

/**
 * Une passe du scheduler : claim + collecte des connecteurs dus.
 * Exposée pour les tests et utilisable sans la boucle.
 * @returns {Promise<{ examined: number, collected: number, errors: number }>}
 */
async function runSchedulerPass({ now = new Date(), log = () => {} } = {}) {
  const RadarConnector = require('../db/models/radar-connector.model');
  const stats = { examined: 0, collected: 0, errors: 0 };

  const candidates = await RadarConnector.find({
    status: { $in: ['active', 'pending', 'error'] },
    $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }],
  }).limit(200).lean();

  const due = candidates.filter(c => isDue(c, now)).slice(0, BATCH_PER_TICK);
  stats.examined = candidates.length;

  for (const cand of due) {
    // Claim atomique — perdu si une autre instance l'a pris entre-temps
    const claimed = await RadarConnector.findOneAndUpdate(
      { _id: cand._id, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }] },
      { $set: { lockedUntil: new Date(now.getTime() + LOCK_MS) } },
      { new: true }
    );
    if (!claimed) continue;

    try {
      const inQuiet = isInQuietHours(now, claimed.pollingPolicy?.quietHours);
      const summary = await collectConnector(claimed, { now, log });
      if (inQuiet || !claimed.lastFullSyncAt) claimed.lastFullSyncAt = now;
      // Réconciliations nocturnes (déterministes, dédupliquées) après la collecte de nuit
      if (inQuiet) {
        const { runReconciliationsForWorkspace } = require('./reconciliations');
        await runReconciliationsForWorkspace(claimed.workspaceId, { now, log })
          .catch(e => log(`[radar-reconciliation] erreur ws ${claimed.workspaceId}: ${e?.message}`));
      }
      if (!summary.ok && /429|rate.?limit/i.test(claimed.lastError || '')) {
        claimed.health.rateLimitedUntil = new Date(now.getTime() + RATE_LIMIT_PAUSE_MS);
      }
      stats.collected++;
      if (!summary.ok) stats.errors++;
    } catch (e) {
      stats.errors++;
      claimed.status = 'error';
      claimed.lastError = e?.message || String(e);
      claimed.health = claimed.health || {};
      claimed.health.consecutiveErrors = (claimed.health.consecutiveErrors || 0) + 1;
      log(`[radar-scheduler] collect failed ${claimed.providerKey}/${claimed.family}: ${claimed.lastError}`);
    } finally {
      claimed.lockedUntil = null;
      try { await claimed.save(); } catch (e) { console.error('[radar-scheduler] unlock failed:', e?.message); }
    }
  }
  return stats;
}

function startRadarScheduler({ tickMs } = {}) {
  if (_timer) return;
  const interval = Number(tickMs || process.env.RADAR_TICK_MS || DEFAULT_TICK_MS);
  console.log(`[radar-scheduler] starting (tick=${interval}ms)`);
  _timer = setInterval(() => {
    _tick().catch(e => console.error('[radar-scheduler] tick error:', e?.message));
  }, interval);
}

async function _tick() {
  const log = (m) => console.log(m);
  await runSchedulerPass({ log });
  // Filtre de signifiance après la collecte (désactivable)
  if (process.env.RADAR_SIGNIFICANCE_ENABLED !== '0') {
    const { runSignificancePass } = require('./significance');
    await runSignificancePass({ log }).catch(e => console.error('[radar-significance] pass error:', e?.message));
  }
  // Superviseur : opt-in explicite (consomme des tokens)
  if (process.env.RADAR_SUPERVISOR_ENABLED === '1') {
    const { runSupervisorPass } = require('./supervisor');
    await runSupervisorPass({ log }).catch(e => console.error('[radar-supervisor] pass error:', e?.message));
  }
}

function stopRadarScheduler() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}

module.exports = {
  startRadarScheduler,
  stopRadarScheduler,
  runSchedulerPass,
  isDue,
  effectiveIntervalMs,
  isInQuietHours,
  quietWindowStart,
  DEFAULT_INTERVALS_MS,
};
