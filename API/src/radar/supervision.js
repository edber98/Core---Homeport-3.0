// Radar — SUPERVISION CONTINUE (R4). Le cerveau ne se contente pas d'analyser à la
// demande : il SURVEILLE. superviseSnapshot capture un INSTANTANÉ synthétique des KPI
// clés du workspace (CA facturé, encaissé, impayé, marge %, clients à risque sentiment,
// nb divergences, breaches SLA si dispo) puis le COMPARE au DERNIER instantané stocké
// pour détecter les CHANGEMENTS SIGNIFICATIFS (nouvelle facture en retard, marge qui
// baisse de plus de 3 points, nouveau client mécontent…).
//
// L'instantané est persisté dans la collection RadarSupervisionSnapshot, ce qui donne
// au Radar une MÉMOIRE temporelle : chaque passage se compare au précédent. Le premier
// passage n'a rien à comparer (note: firstRun). Chaque KPI est calculé en réutilisant
// les analyseurs existants, chacun en try/catch — l'absence ou l'échec de l'un ne fait
// pas tomber la supervision (dégradation gracieuse, zéro infra).
//
// Retour : { kpis, changes:[{kpi, from, to, direction, severity, note}], at, firstRun }

const DAY = 86400000;
const DEFAULT_TERMS_DAYS = 30;

const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const toMs = (v) => { const n = num(v); if (!n) return 0; return n < 1e12 ? n * 1000 : n; };
const round = (x, d = 0) => { const p = Math.pow(10, d); return Math.round(x * p) / p; };

const amountOf = (e) => num(e.attributes?.amount_total) || num(e.attributes?.total_ttc) || num(e.attributes?.amount);
const isPaid = (e) => e.attributes?.state === 'payée' || e.attributes?.payment_state === 'payée';
const isUnpaid = (e) => !isPaid(e) && e.attributes?.payment_state === 'impayée' && e.attributes?.state !== 'brouillon';

function dueMsOf(inv, termsDays) {
  const lim = toMs(inv.attributes?.date_lim_reglement);
  if (lim) return lim;
  const d = toMs(inv.attributes?.date);
  return d ? d + termsDays * DAY : 0;
}

// ───────────────────────────────────────────────────────────────────────────
// CAPTURE DES KPI — chaque bloc en try/catch, réutilise les analyseurs existants.
// ───────────────────────────────────────────────────────────────────────────

async function captureKpis(workspaceId, { termsDays = DEFAULT_TERMS_DAYS, now = Date.now() } = {}) {
  const RadarEntity = require('../db/models/radar-entity.model');

  const kpis = {
    caFacture: 0,        // CA facturé (somme TTC des factures émises, hors brouillon)
    encaisse: 0,         // facturé encaissé (factures payées)
    impaye: 0,           // créances impayées (factures non réglées, hors brouillon)
    nbFacturesEnRetard: 0, // factures impayées dont l'échéance est dépassée
    marginRate: null,    // marge % globale (analyseur de marge)
    nbClientsMecontents: 0, // clients à risque sentiment
    nbDivergences: 0,    // divergences détectées (audit temps réel)
    nbDivergencesHautes: 0,
    nbBreachesSla: null, // breaches SLA (si module ./sla dispo)
  };

  // 1) Financier : CA facturé / encaissé / impayé / factures en retard (directement sur les factures)
  try {
    const invoices = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'invoice' })
      .select('attributes').lean();
    let ca = 0, enc = 0, imp = 0, late = 0;
    for (const inv of invoices) {
      if (inv.attributes?.state === 'brouillon') continue;
      const amt = amountOf(inv);
      ca += amt;
      if (isPaid(inv)) enc += amt;
      else if (isUnpaid(inv)) {
        imp += amt;
        const due = dueMsOf(inv, termsDays);
        if (due && now > due) late++;
      }
    }
    kpis.caFacture = round(ca);
    kpis.encaisse = round(enc);
    kpis.impaye = round(imp);
    kpis.nbFacturesEnRetard = late;
  } catch (e) { /* financier indisponible → on continue */ }

  // 2) Marge globale % (réutilise l'analyseur de marge)
  try {
    const { analyzeMargins } = require('./margin');
    const m = await analyzeMargins(workspaceId);
    if (m && m.totals && m.totals.revenue > 0) kpis.marginRate = round(m.totals.rate, 1);
  } catch (e) { /* marge indisponible → on continue */ }

  // 3) Clients mécontents (réutilise l'analyseur de sentiment)
  try {
    const { analyzeSentiment } = require('./sentiment');
    const s = await analyzeSentiment(workspaceId);
    kpis.nbClientsMecontents = (s.byClient || []).filter(c => c.atRisk).length;
  } catch (e) { /* sentiment indisponible → on continue */ }

  // 4) Divergences (réutilise l'audit temps réel)
  try {
    const { auditDivergences } = require('./audit-live');
    const a = await auditDivergences(workspaceId);
    kpis.nbDivergences = a.counts ? a.counts.total : (a.divergences || []).length;
    kpis.nbDivergencesHautes = a.counts ? a.counts.haute : (a.divergences || []).filter(d => d.severity === 'haute').length;
  } catch (e) { /* audit indisponible → on continue */ }

  // 5) Breaches SLA — seulement si un module ./sla est disponible (optionnel)
  try {
    const sla = require('./sla');
    if (sla && typeof sla.evaluateSla === 'function') {
      const r = await sla.evaluateSla(workspaceId);
      const breaches = (r && (r.breaches || r.violations)) || [];
      kpis.nbBreachesSla = Array.isArray(breaches) ? breaches.length : num(r && r.breachesCount);
    }
  } catch (e) { /* module ./sla absent → KPI reste null (non supervisé) */ }

  return kpis;
}

// ───────────────────────────────────────────────────────────────────────────
// DÉTECTION DES CHANGEMENTS SIGNIFICATIFS entre deux instantanés.
//
// Pour chaque KPI surveillé, on définit la DIRECTION qui constitue une dégradation
// (« worse ») et un SEUIL de significativité (pour ne pas crier au loup sur du bruit).
// La marge a un seuil spécial en POINTS (baisse > 3 pts = significatif).
// ───────────────────────────────────────────────────────────────────────────

function detectChanges(prev, curr) {
  const changes = [];
  const push = (kpi, from, to, direction, severity, note) => changes.push({ kpi, from, to, direction, severity, note });

  // Impayé : une hausse = dégradation. Significatif si +5% ou +500€.
  if (prev.impaye != null && curr.impaye != null && curr.impaye !== prev.impaye) {
    const delta = curr.impaye - prev.impaye;
    const pct = prev.impaye > 0 ? (delta / prev.impaye) * 100 : (delta > 0 ? 100 : 0);
    if (Math.abs(delta) >= 500 || Math.abs(pct) >= 5) {
      const worse = delta > 0;
      push('impaye', prev.impaye, curr.impaye, worse ? 'worse' : 'better', worse ? 'haute' : 'normale',
        `Impayés ${worse ? 'en hausse' : 'en baisse'} de ${Math.abs(round(delta))}€ (${round(pct, 1)}%).`);
    }
  }

  // Factures en retard : toute NOUVELLE facture en retard est un signal fort.
  if (prev.nbFacturesEnRetard != null && curr.nbFacturesEnRetard != null && curr.nbFacturesEnRetard !== prev.nbFacturesEnRetard) {
    const delta = curr.nbFacturesEnRetard - prev.nbFacturesEnRetard;
    const worse = delta > 0;
    push('nbFacturesEnRetard', prev.nbFacturesEnRetard, curr.nbFacturesEnRetard, worse ? 'worse' : 'better', worse ? 'haute' : 'normale',
      worse ? `${delta} nouvelle(s) facture(s) passée(s) en retard de paiement.` : `${-delta} facture(s) régularisée(s).`);
  }

  // Marge % : baisse de plus de 3 POINTS = significatif (exigence explicite).
  if (prev.marginRate != null && curr.marginRate != null && prev.marginRate !== curr.marginRate) {
    const deltaPts = round(curr.marginRate - prev.marginRate, 1);
    if (Math.abs(deltaPts) > 3) {
      const worse = deltaPts < 0;
      push('marginRate', prev.marginRate, curr.marginRate, worse ? 'worse' : 'better', worse ? 'haute' : 'normale',
        `Marge ${worse ? 'en baisse' : 'en hausse'} de ${Math.abs(deltaPts)} pts (${prev.marginRate}% → ${curr.marginRate}%).`);
    }
  }

  // Clients mécontents : tout nouveau client mécontent = signal.
  if (prev.nbClientsMecontents != null && curr.nbClientsMecontents != null && curr.nbClientsMecontents !== prev.nbClientsMecontents) {
    const delta = curr.nbClientsMecontents - prev.nbClientsMecontents;
    const worse = delta > 0;
    push('nbClientsMecontents', prev.nbClientsMecontents, curr.nbClientsMecontents, worse ? 'worse' : 'better', worse ? 'haute' : 'normale',
      worse ? `${delta} nouveau(x) client(s) mécontent(s).` : `${-delta} client(s) réapaisé(s).`);
  }

  // Divergences hautes : toute hausse = dégradation.
  if (prev.nbDivergencesHautes != null && curr.nbDivergencesHautes != null && curr.nbDivergencesHautes !== prev.nbDivergencesHautes) {
    const delta = curr.nbDivergencesHautes - prev.nbDivergencesHautes;
    const worse = delta > 0;
    push('nbDivergencesHautes', prev.nbDivergencesHautes, curr.nbDivergencesHautes, worse ? 'worse' : 'better', worse ? 'haute' : 'normale',
      worse ? `${delta} nouvelle(s) divergence(s) à sévérité haute.` : `${-delta} divergence(s) haute(s) résolue(s).`);
  }

  // Divergences (total) : variation, sévérité normale (vue d'ensemble).
  if (prev.nbDivergences != null && curr.nbDivergences != null && curr.nbDivergences !== prev.nbDivergences) {
    const delta = curr.nbDivergences - prev.nbDivergences;
    const worse = delta > 0;
    push('nbDivergences', prev.nbDivergences, curr.nbDivergences, worse ? 'worse' : 'better', 'normale',
      `Divergences ${worse ? 'en hausse' : 'en baisse'} (${delta > 0 ? '+' : ''}${delta}).`);
  }

  // Encaissement : une baisse du cumulé encaissé est anormale (ré-ouverture/avoir).
  if (prev.encaisse != null && curr.encaisse != null && curr.encaisse < prev.encaisse) {
    const delta = curr.encaisse - prev.encaisse;
    if (Math.abs(delta) >= 500) {
      push('encaisse', prev.encaisse, curr.encaisse, 'worse', 'normale',
        `Encaissé en recul de ${Math.abs(round(delta))}€ (avoir / ré-ouverture ?).`);
    }
  }

  // Breaches SLA : toute hausse = dégradation (si KPI supervisé des deux côtés).
  if (prev.nbBreachesSla != null && curr.nbBreachesSla != null && curr.nbBreachesSla !== prev.nbBreachesSla) {
    const delta = curr.nbBreachesSla - prev.nbBreachesSla;
    const worse = delta > 0;
    push('nbBreachesSla', prev.nbBreachesSla, curr.nbBreachesSla, worse ? 'worse' : 'better', worse ? 'haute' : 'normale',
      worse ? `${delta} nouveau(x) dépassement(s) de SLA.` : `${-delta} SLA rétabli(s).`);
  }

  // tri : sévérité haute d'abord, puis dégradations avant améliorations
  const sevRank = (s) => (s === 'haute' ? 1 : 0);
  const dirRank = (d) => (d === 'worse' ? 1 : 0);
  changes.sort((a, b) => (sevRank(b.severity) - sevRank(a.severity)) || (dirRank(b.direction) - dirRank(a.direction)));
  return changes;
}

// ───────────────────────────────────────────────────────────────────────────
// SUPERVISION : capture + comparaison + persistance.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Capture un instantané des KPI clés et le compare au dernier instantané stocké.
 * @param {ObjectId|string} workspaceId
 * @param {object} [opts]
 * @param {boolean} [opts.persist=true]  persister le nouvel instantané
 * @param {number}  [opts.termsDays]     termes de règlement par défaut (échéance)
 * @param {number}  [opts.now]           horloge injectable (tests)
 * @returns {Promise<{kpis, changes, at, firstRun, prevAt}>}
 */
async function superviseSnapshot(workspaceId, { persist = true, termsDays = DEFAULT_TERMS_DAYS, now = Date.now() } = {}) {
  const RadarSupervisionSnapshot = require('../db/models/radar-supervision-snapshot.model');

  const at = new Date(now);
  const kpis = await captureKpis(workspaceId, { termsDays, now });

  // dernier instantané stocké (mémoire temporelle)
  const prevDoc = await RadarSupervisionSnapshot.findOne({ workspaceId }).sort({ at: -1 }).lean();
  const firstRun = !prevDoc;

  const changes = firstRun ? [] : detectChanges(prevDoc.kpis || {}, kpis);

  if (persist) {
    await RadarSupervisionSnapshot.create({ workspaceId, at, kpis });
  }

  return { kpis, changes, at, firstRun, prevAt: prevDoc ? prevDoc.at : null };
}

module.exports = { superviseSnapshot, captureKpis, detectChanges };
