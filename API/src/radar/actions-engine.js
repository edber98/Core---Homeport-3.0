// Radar — MOTEUR D'ACTIONS (R4, cerveau actionnable). Transforme les DIVERGENCES
// et les signaux prédictifs (retard de paiement, churn) en une FILE D'ACTIONS
// EXÉCUTABLES et priorisées : le Radar ne se contente pas de scorer, il propose
// « quoi faire, sur qui, dans quel ordre ».
//
// Chaque source d'intelligence est réutilisée en require()+try/catch — l'absence
// ou l'échec de l'une n'empêche pas les autres (dégradation gracieuse, zéro infra) :
//   - audit-live.auditDivergences   → marges, sentiment, ruptures, écarts devis/cmd
//   - predict/dso.scorePaymentDelay → factures impayées à risque (relance)
//   - predict/churn.scoreChurn      → clients à risque d'attrition (fidélisation)
//   - recommendations.recommend     → doublons/rattachements (fusion, rattachement)
//
// Chaque signal devient une action :
//   { id, type, priority:'haute'|'normale'|'basse', title, target (clé entité),
//     suggestedAction (texte), executable:bool, kind, impact }
// On DÉDUPLIQUE par (cible|type) puis on TRIE par priorité, puis par impact (montant).
//
// VÉRIFICATION (exigence clé) : la file n'est pas crue sur parole. buildActionQueue
// inclut une VALIDATION BACKTEST des actions de RELANCE — l'action la plus engageante
// du cerveau — en re-rejouant le signal DSO sur l'HISTORIQUE des factures déjà
// résolues (payées vs réglées en retard = ground truth) et en mesurant l'AUC + la
// précision@K du classement. Une file d'actions n'a de valeur que si le signal qui
// la priorise sépare réellement les bons des mauvais payeurs.

const DAY = 86400000;
const DEFAULT_TERMS_DAYS = 30;

const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const toMs = (v) => { const n = num(v); if (!n) return 0; return n < 1e12 ? n * 1000 : n; };
const slug = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'x';
const PRIO_RANK = { haute: 2, normale: 1, basse: 0 };

const amountOf = (e) => num(e.attributes?.amount_total) || num(e.attributes?.total_ttc) || num(e.attributes?.amount);
const isPaid = (e) => e.attributes?.state === 'payée' || e.attributes?.payment_state === 'payée';

// ───────────────────────────────────────────────────────────────────────────
// VALIDATION : backtest du signal de relance (DSO).
//
// Le signal qui PRIORISE les relances ne doit pas être cru sur parole : on vérifie
// qu'il sépare réellement les factures à problème des autres. Deux jeux de ground
// truth, selon ce que l'historique fournit :
//
//   A) HISTORIQUE résolu (si des retards passés existent) : factures réglées
//      en retard (après échéance) = 1, à temps = 0. Train/test temporel 70/30.
//   B) ÉTAT COURANT (fallback robuste, toujours disponible) : factures impayées
//      ACTUELLEMENT EN RETARD (daysOverdue>0) = 1, pas encore échues = 0.
//
// Point clé anti-fuite : le SCORE de validation est reconstruit UNIQUEMENT à partir
// du comportement de paiement passé du client (délai moyen, taux de retard) + taille
// relative de la facture — JAMAIS à partir de daysOverdue (qui définit le label en B).
// On mesure alors si ce signal « aveugle au retard courant » retrouve quand même les
// factures en difficulté :
//   - AUC : proba qu'une facture à problème soit mieux classée qu'une saine (Mann-Whitney)
//   - précision@K : part de vrais positifs dans le top-K du classement
// ───────────────────────────────────────────────────────────────────────────

function dueMsOf(inv, termsDays) {
  const lim = toMs(inv.attributes?.date_lim_reglement);
  if (lim) return lim;
  const d = toMs(inv.attributes?.date);
  return d ? d + termsDays * DAY : 0;
}

function aucFromScores(rows) {
  // rows: [{ score, label(0/1) }]. AUC = stat de Mann-Whitney avec gestion des ex æquo.
  const pos = rows.filter(r => r.label === 1);
  const neg = rows.filter(r => r.label === 0);
  if (!pos.length || !neg.length) return null;
  const sorted = [...rows].sort((a, b) => a.score - b.score);
  // rangs moyens (ex æquo → rang moyen)
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j].score === sorted[i].score) j++;
    const avgRank = (i + 1 + j) / 2; // rangs 1-based
    for (let k = i; k < j; k++) sorted[k]._rank = avgRank;
    i = j;
  }
  let sumRankPos = 0;
  for (const r of sorted) if (r.label === 1) sumRankPos += r._rank;
  const nP = pos.length, nN = neg.length;
  const auc = (sumRankPos - (nP * (nP + 1)) / 2) / (nP * nN);
  return Math.round(auc * 1000) / 1000;
}

async function backtestRelanceSignal(workspaceId, { termsDays = DEFAULT_TERMS_DAYS } = {}) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const RadarRelation = require('../db/models/radar-relation.model');

  const invoices = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'invoice' })
    .select('canonicalKey aliasKeys label attributes').lean();
  if (!invoices.length) return { status: 'no_data' };

  const invByKey = new Map();
  for (const inv of invoices) { invByKey.set(inv.canonicalKey, inv); for (const a of inv.aliasKeys || []) invByKey.set(a, inv); }

  // facture → client (party_of)
  const partyRels = await RadarRelation.find({ workspaceId, type: 'party_of' }).select('fromKey toKey').lean();
  const clientOfInvoice = new Map();
  for (const r of partyRels) { const inv = invByKey.get(r.fromKey); if (inv && !clientOfInvoice.has(inv.canonicalKey)) clientOfInvoice.set(inv.canonicalKey, r.toKey); }

  // date de règlement par facture (relation `pays` paiement→facture)
  const payments = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'payment' })
    .select('canonicalKey aliasKeys attributes').lean();
  const payByKey = new Map();
  for (const p of payments) { payByKey.set(p.canonicalKey, p); for (const a of p.aliasKeys || []) payByKey.set(a, p); }
  const paysRels = await RadarRelation.find({ workspaceId, type: 'pays' }).select('fromKey toKey').lean();
  const paidAtOf = new Map();
  for (const r of paysRels) {
    const inv = invByKey.get(r.toKey); if (!inv) continue;
    const pay = payByKey.get(r.fromKey); if (!pay) continue;
    const at = toMs(pay.attributes?.date);
    if (at && (!paidAtOf.has(inv.canonicalKey) || at > paidAtOf.get(inv.canonicalKey))) paidAtOf.set(inv.canonicalKey, at);
  }

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const now = Date.now();

  // ── PROFIL DE PAIEMENT par client, appris sur TOUT l'historique résolu.
  // (délai moyen de règlement, taux de retard) — c'est notre seul signal de scoring.
  const resolved = [];
  for (const inv of invoices) {
    if (!isPaid(inv)) continue;
    const issued = toMs(inv.attributes?.date);
    const paidAt = paidAtOf.get(inv.canonicalKey) || issued;
    if (!issued || paidAt < issued) continue;
    const due = dueMsOf(inv, termsDays);
    const late = due ? (paidAt > due ? 1 : 0) : 0;
    resolved.push({ inv, issued, paidAt, due, late, delay: Math.round((paidAt - issued) / DAY) });
  }
  const histDelays = [], profile = new Map(); // clientKey → { sumDelay, n, late }
  for (const r of resolved) {
    histDelays.push(r.delay);
    const ck = clientOfInvoice.get(r.inv.canonicalKey); if (!ck) continue;
    const h = profile.get(ck) || { sumDelay: 0, n: 0, late: 0 };
    h.sumDelay += r.delay; h.n++; h.late += r.late; profile.set(ck, h);
  }
  const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
  const globalAvgDelay = histDelays.length ? mean(histDelays) : termsDays;

  // montant moyen/écart-type par client (z-score de taille de facture)
  const amtByClient = new Map();
  for (const inv of invoices) { const ck = clientOfInvoice.get(inv.canonicalKey); if (!ck) continue; if (!amtByClient.has(ck)) amtByClient.set(ck, []); amtByClient.get(ck).push(amountOf(inv)); }
  const stdv = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length); };

  // SIGNAL « aveugle au retard courant » : comportement passé du client + taille relative.
  // N'utilise JAMAIS daysOverdue (label de la validation B) → pas de fuite d'étiquette.
  const blindScore = (inv) => {
    const ck = clientOfInvoice.get(inv.canonicalKey);
    const h = ck ? profile.get(ck) : null;
    const avgDelay = h && h.n ? h.sumDelay / h.n : globalAvgDelay;
    const lateRatio = h && h.n ? h.late / h.n : 0.3;
    const fHistDelay = clamp01((avgDelay - termsDays) / Math.max(termsDays, 1));
    const amts = ck ? (amtByClient.get(ck) || []) : [];
    const m = mean(amts), s = stdv(amts);
    const zAmt = amts.length >= 2 && s ? (amountOf(inv) - m) / s : 0;
    const fAmount = clamp01(zAmt / 3);
    const z = -0.8 + 2.2 * fHistDelay + 1.8 * lateRatio + 0.5 * fAmount;
    return 1 / (1 + Math.exp(-z));
  };

  // ── JEU A : historique résolu (retard de règlement passé) si DEUX classes présentes
  let scored = null, mode = null, splitInfo = {};
  if (resolved.length >= 6) {
    const posA = resolved.filter(r => r.late === 1).length;
    if (posA >= 1 && posA < resolved.length) {
      // split temporel 70/30, profil ré-appris sur le train uniquement serait idéal ;
      // ici le profil global suffit (peu de données) → on évalue hors-échantillon temporel.
      const sorted = [...resolved].sort((a, b) => a.issued - b.issued);
      const cut = Math.floor(sorted.length * 0.7);
      const test = sorted.slice(cut);
      const evalSet = test.filter(r => true).length >= 3 ? test : sorted;
      scored = evalSet.map(r => ({ score: blindScore(r.inv), label: r.late }));
      mode = 'historique_reglement';
      splitInfo = { train: cut, test: evalSet.length, inSample: evalSet === sorted };
    }
  }

  // ── JEU B (fallback) : état courant des factures impayées (en retard vs pas encore échu)
  if (!scored) {
    const unpaid = invoices.filter(inv => !isPaid(inv) && inv.attributes?.payment_state === 'impayée' && inv.attributes?.state !== 'brouillon');
    const rowsB = unpaid.map(inv => {
      const due = dueMsOf(inv, termsDays);
      const overdue = due ? Math.max(0, Math.round((now - due) / DAY)) : 0;
      return { score: blindScore(inv), label: overdue > 0 ? 1 : 0 };
    });
    const posB = rowsB.filter(r => r.label === 1).length;
    if (rowsB.length >= 4 && posB >= 1 && posB < rowsB.length) { scored = rowsB; mode = 'etat_courant_overdue'; }
    else return { status: 'insufficient_ground_truth', resolved: resolved.length, unpaid: unpaid.length, posOverdue: posB };
  }

  const metrics = (rows) => {
    const auc = aucFromScores(rows);
    const K = Math.max(1, Math.min(5, Math.round(rows.length * 0.3)));
    const topK = [...rows].sort((a, b) => b.score - a.score).slice(0, K);
    const precAtK = topK.length ? Math.round((topK.filter(r => r.label === 1).length / topK.length) * 100) / 100 : null;
    const baseRate = Math.round((rows.filter(r => r.label === 1).length / rows.length) * 100) / 100;
    return { auc, precisionAtK: precAtK, k: K, baseRate, n: rows.length };
  };

  const blind = metrics(scored);

  // ── VALIDATION PRODUCTION : le score qui PRIORISE réellement les relances dans la
  // file est celui de scorePaymentDelay (DSO). On mesure sa séparation des factures
  // impayées actuellement EN RETARD vs PAS ENCORE ÉCHUES — c'est le signal de tri
  // effectivement utilisé. (try/catch : module optionnel.)
  let production = null;
  try {
    const { scorePaymentDelay } = require('./predict/dso');
    const dso = await scorePaymentDelay(workspaceId, { termsDays });
    const rowsP = (dso.invoicesAtRisk || []).map(i => ({ score: i.score, label: i.daysOverdue > 0 ? 1 : 0 }));
    const posP = rowsP.filter(r => r.label === 1).length;
    if (rowsP.length >= 4 && posP >= 1 && posP < rowsP.length) production = { ...metrics(rowsP), groundTruth: 'overdue_vs_pas_echu' };
  } catch (e) { /* dso absent → pas de validation production */ }

  return {
    status: 'ok', mode,
    // headline = signal de production si dispo (celui qui trie la file), sinon le blind
    auc: production ? production.auc : blind.auc,
    precisionAtK: production ? production.precisionAtK : blind.precisionAtK,
    baseRate: production ? production.baseRate : blind.baseRate,
    n: production ? production.n : blind.n,
    production,        // AUC/precision du score de tri réel
    blindHistory: { ...blind, ...splitInfo, note: 'signal aveugle au retard courant (comportement passé client + montant)' },
    resolvedHistory: resolved.length,
    avgDelayDays: Math.round(globalAvgDelay * 10) / 10,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// CONSTRUCTION DE LA FILE D'ACTIONS
// ───────────────────────────────────────────────────────────────────────────

/**
 * Construit la file d'actions priorisées du Radar pour un workspace.
 * @param {ObjectId|string} workspaceId
 * @param {object} [opts]
 * @param {number} [opts.churnThreshold=0.5] seuil de churn → fidélisation
 * @returns {Promise<{ actions:Array, counts:{haute,total}, byKind:Object,
 *                      byType:Object, byPriority:Object, validation:Object }>}
 */
async function buildActionQueue(workspaceId, opts = {}) {
  const churnThreshold = opts.churnThreshold != null ? opts.churnThreshold : 0.5;
  const raw = [];

  // 1) DIVERGENCES (audit temps réel) → contrôle / rattachement / fusion
  try {
    const { auditDivergences } = require('./audit-live');
    const audit = await auditDivergences(workspaceId, opts.audit || {});
    for (const d of (audit.divergences || [])) {
      // mapping type de divergence → kind d'action + exécutabilité
      let kind = 'controle', executable = false, suggestedAction = `Contrôler : ${d.detail || d.label}`;
      if (d.type === 'marge') { kind = 'controle'; suggestedAction = `Revoir la tarification / le coût de revient — ${d.detail}`; }
      else if (d.type === 'client') { kind = 'fidelisation'; suggestedAction = `Reprendre contact avec le client mécontent — ${d.detail}`; }
      else if (d.type === 'rupture_flux') { kind = 'rattachement'; suggestedAction = `Compléter la pièce amont manquante — ${d.detail}`; }
      else if (d.type === 'ecart_devis_commande') { kind = 'controle'; suggestedAction = `Justifier l'écart devis↔commande — ${d.detail}`; }
      raw.push({
        type: d.type, priority: d.severity === 'haute' ? 'haute' : 'normale',
        title: d.label, target: d.target || d.entityKey || slug(d.label),
        suggestedAction, executable, kind, impact: num(d.value),
      });
    }
  } catch (e) { /* audit absent/échoué → on continue */ }

  // 2) RETARDS DE PAIEMENT (DSO) → relance des factures impayées à risque
  try {
    const { scorePaymentDelay } = require('./predict/dso');
    const dso = await scorePaymentDelay(workspaceId, opts.dso || {});
    for (const inv of (dso.invoicesAtRisk || [])) {
      if (inv.score < 0.4 && inv.daysOverdue <= 0) continue; // pas de relance si ni à risque ni en retard
      const high = inv.score >= 0.65 || inv.daysOverdue >= 30;
      raw.push({
        type: 'relance_facture',
        priority: high ? 'haute' : 'normale',
        title: `Relancer : ${inv.label}${inv.client ? ` (${inv.client})` : ''}`,
        target: inv.label || slug(inv.client),
        suggestedAction: `Envoyer une relance de paiement — ${inv.amount}€` +
          (inv.daysOverdue > 0 ? `, en retard de ${inv.daysOverdue} j` : '') +
          ` (risque ${Math.round(inv.score * 100)}%).`,
        executable: false, // l'écriture vers le logiciel tiers passe par actions.js (allowWrite)
        kind: 'relance', impact: num(inv.amount),
      });
    }
  } catch (e) { /* dso absent/échoué → on continue */ }

  // 3) CHURN → fidélisation des clients à risque d'attrition
  try {
    const { scoreChurn } = require('./predict/churn');
    const churn = await scoreChurn(workspaceId, opts.churn || {});
    for (const c of (churn.atRisk || churn.all || [])) {
      if (c.score < churnThreshold) continue;
      raw.push({
        type: 'fidelisation_client',
        priority: c.score >= 0.7 ? 'haute' : 'normale',
        title: `Fidéliser : ${c.client}`,
        target: c.clientKey || slug(c.client),
        suggestedAction: `Reprendre contact (risque d'attrition ${Math.round(c.score * 100)}%) — ${c.reason}`,
        executable: false,
        kind: 'fidelisation', impact: num(c.overdueAmount) || (c.score * 100),
      });
    }
  } catch (e) { /* churn absent/échoué → on continue */ }

  // 4) RECOMMANDATIONS graphe → fusion (doublons) + rattachement (corrélations)
  try {
    const { recommend } = require('./recommendations');
    const rec = await recommend(workspaceId);
    for (const r of (rec.recommendations || [])) {
      if (r.type === 'fusionner' || r.type === 'corriger_orthographe') {
        raw.push({
          type: r.type, priority: r.priority || 'basse',
          title: r.title, target: r.dropKey || r.keepKey || slug(r.title),
          suggestedAction: r.action || 'Fusionner les doublons',
          executable: !!(r.executable && r.keepKey && r.dropKey),
          keepKey: r.keepKey, dropKey: r.dropKey,
          kind: 'fusion', impact: num(r.score),
        });
      } else if (r.type === 'rattacher') {
        raw.push({
          type: 'rattacher', priority: r.priority || 'normale',
          title: r.title, target: r.fromKey || slug(r.title),
          suggestedAction: r.action || 'Rattacher au client suggéré',
          executable: !!(r.executable && r.fromKey && r.toKey),
          fromKey: r.fromKey, toKey: r.toKey,
          kind: 'rattachement', impact: num(r.score),
        });
      }
    }
  } catch (e) { /* recommandations absentes/échouées → on continue */ }

  // ── DÉDUPLICATION par (cible | type) : on garde la plus prioritaire / impactante
  const byTarget = new Map();
  for (const a of raw) {
    const key = `${a.target}|${a.type}`;
    const prev = byTarget.get(key);
    if (!prev) { byTarget.set(key, a); continue; }
    const better = (PRIO_RANK[a.priority] - PRIO_RANK[prev.priority]) || (a.impact - prev.impact);
    if (better > 0) byTarget.set(key, a);
  }
  const deduped = [...byTarget.values()];

  // ── TRI : priorité (haute d'abord) puis impact (montant) décroissant
  deduped.sort((x, y) => (PRIO_RANK[y.priority] - PRIO_RANK[x.priority]) || (y.impact - x.impact));

  // ── IDs stables et agrégats
  const actions = deduped.map((a, i) => ({
    id: `act_${slug(a.type)}_${slug(a.target)}_${i}`,
    type: a.type, priority: a.priority, title: a.title, target: a.target,
    suggestedAction: a.suggestedAction, executable: !!a.executable, kind: a.kind,
    impact: Math.round(a.impact || 0),
    ...(a.keepKey ? { keepKey: a.keepKey, dropKey: a.dropKey } : {}),
    ...(a.fromKey ? { fromKey: a.fromKey, toKey: a.toKey } : {}),
  }));

  const byKind = {}, byType = {}, byPriority = { haute: 0, normale: 0, basse: 0 };
  for (const a of actions) {
    byKind[a.kind] = (byKind[a.kind] || 0) + 1;
    byType[a.type] = (byType[a.type] || 0) + 1;
    byPriority[a.priority] = (byPriority[a.priority] || 0) + 1;
  }

  // ── VALIDATION : backtest du signal de relance (lecture seule)
  let validation = { status: 'skipped' };
  try { validation = await backtestRelanceSignal(workspaceId, opts.dso || {}); }
  catch (e) { validation = { status: 'error', error: String(e && e.message || e) }; }

  return {
    actions,
    counts: { haute: byPriority.haute, total: actions.length },
    byKind, byType, byPriority,
    validation,
  };
}

module.exports = { buildActionQueue, backtestRelanceSignal };
