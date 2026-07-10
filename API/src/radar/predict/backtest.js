// Radar — BACK-TEST des scorers prédictifs contre la VÉRITÉ HISTORIQUE (validation).
//
// Objectif : ne pas se contenter de scorer, mais VÉRIFIER que les scores produits par
// les modules predict/ séparent réellement les bons des mauvais cas. Pour chaque modèle
// dont l'issue est connue dans l'historique, on reconstruit le couple (score, label réel)
// puis on mesure la qualité de séparation avec des métriques calculées À LA MAIN, sans
// dépendance ML lourde :
//
//   - AUC (aire sous la courbe ROC) via tri par score + somme des rangs (statistique de
//     Mann-Whitney) : AUC = (Σrang_positifs − n1(n1+1)/2) / (n1·n0). 0.5 = hasard, 1 = parfait.
//   - accuracy au seuil 0.5 (part de prédictions correctes).
//   - précision@K (part de vrais positifs dans les K cas les mieux notés).
//   - Brier score (erreur quadratique moyenne des probabilités) pour les modèles calibrés.
//
// MODÈLES BACK-TESTÉS :
//   1) DSO / retard de paiement — factures RÉSOLUES. Label=1 si la facture a été réglée
//      EN RETARD (date paiement > échéance) ou si elle est aujourd'hui en RETARD AVÉRÉ
//      (impayée, échéance dépassée) ; label=0 si réglée à temps. On RECALCULE le score de
//      risque (mêmes features/poids que predict/dso.js, mais applicable aux factures
//      résolues que le scorer de prod n'évalue pas) et on mesure la séparation.
//   2) Win-rate — devis RÉSOLUS (gagnés/perdus). On appelle predict/winrate.js, on récupère
//      sa proba pour chaque devis résolu en RE-SCORANT l'historique (le scorer expose les
//      ouverts ; ici on rejoue la même cote sur les résolus à partir des features réelles),
//      puis on compare au résultat réel → AUC + accuracy@0.5 + Brier.
//   3) Churn — pas de vrai label d'attrition dans l'historique. On utilise un PROXY :
//      client « dormant » (aucune commande/facture depuis `dormantDays` j) = label 1,
//      « actif » = 0. On rejoue scoreChurn() et on mesure si son score sépare dormants/actifs.
//
// Le module est défensif sur les petits effectifs : si une classe est vide ou n < minN,
// la métrique n'est pas calculable → on renvoie n et une `note` explicite (auc=null).

const DAY = 86400000;
const DEFAULT_TERMS_DAYS = 30;   // termes présumés (pas de date_lim_reglement dans les données)
const DEFAULT_DORMANT_DAYS = 60; // proxy churn : > 60 j sans pièce ferme = dormant

const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const toMs = (v) => { const n = num(v); if (!n) return 0; return n < 1e12 ? n * 1000 : n; };
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const round = (x, d = 3) => { const p = Math.pow(10, d); return Math.round(x * p) / p; };
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const std = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length); };

// ── MÉTRIQUES (calculées à la main) ──────────────────────────────────────────

/**
 * AUC ROC par la statistique de rang (Mann-Whitney U), gère les ex-aequo (rang moyen).
 * pairs = [{score, label}], label ∈ {0,1}. @returns number|null (null si une classe vide)
 */
function aucRanked(pairs) {
  const n1 = pairs.filter((p) => p.label === 1).length;
  const n0 = pairs.length - n1;
  if (n1 === 0 || n0 === 0) return null;
  // tri ascendant par score, rangs 1..N avec rang moyen sur les ex-aequo
  const sorted = [...pairs].sort((a, b) => a.score - b.score);
  const ranks = new Array(sorted.length);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].score === sorted[i].score) j++;
    const avgRank = (i + 1 + (j + 1)) / 2;   // rangs 1-based
    for (let k = i; k <= j; k++) ranks[k] = avgRank;
    i = j + 1;
  }
  let sumRankPos = 0;
  for (let k = 0; k < sorted.length; k++) if (sorted[k].label === 1) sumRankPos += ranks[k];
  const auc = (sumRankPos - (n1 * (n1 + 1)) / 2) / (n1 * n0);
  return round(auc, 3);
}

/** Accuracy au seuil donné (défaut 0.5). */
function accuracyAt(pairs, thr = 0.5) {
  if (!pairs.length) return null;
  let ok = 0;
  for (const p of pairs) if ((p.score >= thr ? 1 : 0) === p.label) ok++;
  return round(ok / pairs.length, 3);
}

/** Précision@K : part de vrais positifs dans les K scores les plus élevés. */
function precisionAtK(pairs, k) {
  if (!pairs.length) return null;
  const K = Math.min(k, pairs.length);
  const top = [...pairs].sort((a, b) => b.score - a.score).slice(0, K);
  const tp = top.filter((p) => p.label === 1).length;
  return round(tp / K, 3);
}

/** Brier score : erreur quadratique moyenne entre proba et label (0=parfait, 0.25=hasard). */
function brier(pairs) {
  if (!pairs.length) return null;
  return round(mean(pairs.map((p) => (p.score - p.label) * (p.score - p.label))), 3);
}

// ── 1) BACK-TEST DSO / RETARD DE PAIEMENT ────────────────────────────────────
// On reconstruit l'historique facture→paiement, on définit le label réel (retard avéré),
// on RECALCULE le score de risque avec les mêmes features/poids que predict/dso.js, puis
// on mesure si le score sépare bien les factures problématiques des règlements propres.
async function backtestDso(RadarEntity, RadarRelation, workspaceId, { termsDays = DEFAULT_TERMS_DAYS, now = Date.now() } = {}) {
  const name = 'dso_payment_delay';
  const invoices = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'invoice' })
    .select('canonicalKey aliasKeys label attributes firstSeenAt').lean();
  if (!invoices.length) return { name, n: 0, auc: null, accuracy: null, precisionAtK: null, note: 'aucune facture' };

  const invByKey = new Map();
  for (const inv of invoices) { invByKey.set(inv.canonicalKey, inv); for (const a of inv.aliasKeys || []) invByKey.set(a, inv); }

  // facture → client (party_of)
  const parties = await RadarEntity.find({ workspaceId, coreType: 'Party' }).select('canonicalKey aliasKeys').lean();
  const partyByKey = new Map();
  for (const p of parties) { partyByKey.set(p.canonicalKey, p.canonicalKey); for (const a of p.aliasKeys || []) partyByKey.set(a, p.canonicalKey); }
  const partyRels = await RadarRelation.find({ workspaceId, type: 'party_of' }).select('fromKey toKey').lean();
  const clientOfInvoice = new Map();
  for (const r of partyRels) { const inv = invByKey.get(r.fromKey); if (!inv) continue; const ck = partyByKey.get(r.toKey) || r.toKey; if (!clientOfInvoice.has(inv.canonicalKey)) clientOfInvoice.set(inv.canonicalKey, ck); }

  // paiements → date de règlement par facture (relation `pays`)
  const payments = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'payment' }).select('canonicalKey aliasKeys attributes').lean();
  const payByKey = new Map();
  for (const p of payments) { payByKey.set(p.canonicalKey, p); for (const a of p.aliasKeys || []) payByKey.set(a, p); }
  const paysRels = await RadarRelation.find({ workspaceId, type: 'pays' }).select('fromKey toKey').lean();
  const paidAtOf = new Map();
  for (const r of paysRels) { const inv = invByKey.get(r.toKey); if (!inv) continue; const pay = payByKey.get(r.fromKey); if (!pay) continue; const at = toMs(pay.attributes?.date); if (at && (!paidAtOf.has(inv.canonicalKey) || at > paidAtOf.get(inv.canonicalKey))) paidAtOf.set(inv.canonicalKey, at); }

  const isPaid = (e) => e.attributes?.state === 'payée' || e.attributes?.payment_state === 'payée';
  const isUnpaid = (e) => !isPaid(e) && e.attributes?.payment_state === 'impayée' && e.attributes?.state !== 'brouillon';
  const amountOf = (e) => num(e.attributes?.amount_total) || num(e.attributes?.total_ttc) || num(e.attributes?.amount);
  const dueMsOf = (inv) => { const lim = toMs(inv.attributes?.date_lim_reglement); if (lim) return lim; const d = toMs(inv.attributes?.date); return d ? d + termsDays * DAY : 0; };

  // profil historique par client (mêmes features que dso.js) sur les factures PAYÉES
  const hist = new Map(); const globalDelays = [];
  for (const inv of invoices) {
    if (!isPaid(inv)) continue;
    const issued = toMs(inv.attributes?.date); const paidAt = paidAtOf.get(inv.canonicalKey) || issued;
    if (!issued || paidAt < issued) continue;
    const delay = Math.round((paidAt - issued) / DAY); const due = dueMsOf(inv); const late = due ? paidAt > due : false;
    globalDelays.push(delay);
    const ck = clientOfInvoice.get(inv.canonicalKey); if (!ck) continue;
    const h = hist.get(ck) || { delays: [], lateCount: 0, settled: 0 }; h.delays.push(delay); h.settled++; if (late) h.lateCount++; hist.set(ck, h);
  }
  const profile = new Map();
  for (const [ck, h] of hist) profile.set(ck, { avgDelay: mean(h.delays), lateRatio: h.settled ? h.lateCount / h.settled : 0 });
  const globalAvgDelay = mean(globalDelays);
  const amtByClient = new Map();
  for (const inv of invoices) { const ck = clientOfInvoice.get(inv.canonicalKey); if (!ck) continue; if (!amtByClient.has(ck)) amtByClient.set(ck, []); amtByClient.get(ck).push(amountOf(inv)); }

  // RE-SCORE chaque facture RÉSOLUE (payée OU impayée échéance dépassée) + label réel
  const pairs = [];
  for (const inv of invoices) {
    const paid = isPaid(inv); const unpaidOpen = isUnpaid(inv);
    if (!paid && !unpaidOpen) continue;            // brouillon impayé = non résolu → exclu
    const due = dueMsOf(inv); if (!due) continue;

    let label, daysOverdue;
    if (paid) {
      const paidAt = paidAtOf.get(inv.canonicalKey) || toMs(inv.attributes?.date);
      label = paidAt > due ? 1 : 0;                 // réglée en retard = problématique
      daysOverdue = 0;                              // déjà réglée : pas de créance courante
    } else {
      // impayée échéance dépassée = retard AVÉRÉ (label 1) ; sinon pas encore résolue → exclue
      if (now <= due) continue;
      label = 1; daysOverdue = Math.max(0, Math.round((now - due) / DAY));
    }

    const ck = clientOfInvoice.get(inv.canonicalKey) || null;
    const prof = ck ? profile.get(ck) : null;
    const amount = amountOf(inv);
    const fOverdue = clamp01(daysOverdue / 60);
    const avgDelay = prof ? prof.avgDelay : globalAvgDelay;
    const fHistDelay = clamp01((avgDelay - termsDays) / termsDays);
    const fLateRatio = prof ? prof.lateRatio : 0.3;
    const amts = ck ? (amtByClient.get(ck) || []) : [];
    const zAmt = (() => { if (amts.length < 2) return 0; const m = mean(amts), s = std(amts); return s ? (amount - m) / s : 0; })();
    const fAmount = clamp01(zAmt / 3);
    const z = -1.2 + 2.4 * fOverdue + 1.4 * fHistDelay + 1.6 * fLateRatio + 0.6 * fAmount;
    pairs.push({ score: clamp01(sigmoid(z)), label });
  }

  const n = pairs.length;
  const pos = pairs.filter((p) => p.label === 1).length, neg = n - pos;
  if (n < 6 || pos === 0 || neg === 0) {
    return { name, n, auc: null, accuracy: accuracyAt(pairs), precisionAtK: null,
      note: `peu de données résolues (${n} factures, ${pos} en retard / ${neg} à temps) — AUC non significative` };
  }
  return {
    name, n,
    auc: aucRanked(pairs),
    accuracy: accuracyAt(pairs, 0.5),
    precisionAtK: precisionAtK(pairs, Math.min(5, pos)),
    note: `${pos} factures en retard avéré vs ${neg} réglées à temps`,
  };
}

// ── 2) BACK-TEST WIN-RATE ────────────────────────────────────────────────────
// On rejoue la logique de proba de predict/winrate.js sur les devis RÉSOLUS (gagnés/perdus)
// — le scorer de prod ne note que les ouverts. On apprend le taux de base sur les résolus
// puis on re-score chaque devis résolu avec les mêmes multiplicateurs de cote, et on compare
// la proba au résultat réel (gagné=1 / perdu=0).
async function backtestWinrate(RadarEntity, RadarRelation, workspaceId, { now = Math.round(Date.now() / 1000) } = {}) {
  const name = 'winrate_quote_conversion';
  const WON = new Set(['signé', 'signe', 'accepté', 'accepte', 'gagné', 'gagne']);
  const LOST = new Set(['refusé', 'refuse', 'perdu', 'annulé', 'annule']);
  const amountOf = (e) => num(e.attributes?.amount_total) || num(e.attributes?.total_ttc);
  const dateOf = (e) => num(e.attributes?.date) || (e.firstSeenAt ? Math.round(new Date(e.firstSeenAt).getTime() / 1000) : 0);
  const toOdds = (p) => { const c = clamp(p, 0.001, 0.999); return c / (1 - c); };
  const fromOdds = (o) => o / (1 + o);
  const DAY_S = 86400;

  const quotes = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'quote' })
    .select('canonicalKey aliasKeys label attributes firstSeenAt').lean();
  if (!quotes.length) return { name, n: 0, auc: null, accuracy: null, precisionAtK: null, note: 'aucun devis' };

  const quoteKeys = new Set();
  for (const q of quotes) { quoteKeys.add(q.canonicalKey); for (const a of q.aliasKeys || []) quoteKeys.add(a); }

  // client + segment (party_of role client)
  const clients = await RadarEntity.find({ workspaceId, coreType: 'Party', roles: 'client' }).select('canonicalKey aliasKeys label attributes').lean();
  const clientInfo = new Map();
  for (const c of clients) { const info = { canon: c.canonicalKey, segment: c.attributes?.segment || 'inconnu' }; clientInfo.set(c.canonicalKey, info); for (const a of c.aliasKeys || []) clientInfo.set(a, info); }
  const partyRels = await RadarRelation.find({ workspaceId, type: 'party_of', role: 'client' }).select('fromKey toKey').lean();
  const clientOfQuote = new Map();
  for (const r of partyRels) { if (quoteKeys.has(r.fromKey)) { const ci = clientInfo.get(r.toKey); if (ci) clientOfQuote.set(r.fromKey, ci); } }

  // commandes dérivées (order --derived_from--> quote) → signal quasi-gagné
  const derived = await RadarRelation.find({ workspaceId, type: 'derived_from' }).select('toKey').lean();
  const quoteHasOrder = new Set();
  for (const r of derived) if (quoteKeys.has(r.toKey)) quoteHasOrder.add(r.toKey);

  // sentiment moyen par client
  const emails = await RadarEntity.find({ workspaceId, coreType: 'Communication', subtype: 'email' }).select('canonicalKey attributes').lean();
  const SENT = { 'positif': 1, 'neutre': 0, 'négatif': -1, 'negatif': -1 };
  const emailRels = await RadarRelation.find({ workspaceId, type: { $in: ['references', 'party_of'] } }).select('fromKey toKey').lean();
  const clientCanonKeys = new Set([...clientInfo.values()].map((c) => c.canon));
  const clientOfEmail = new Map();
  for (const r of emailRels) { if (clientCanonKeys.has(r.toKey) && !clientOfEmail.has(r.fromKey)) clientOfEmail.set(r.fromKey, r.toKey); }
  const sentAgg = new Map();
  for (const e of emails) { const ck = clientOfEmail.get(e.canonicalKey); if (!ck) continue; const s = SENT[e.attributes?.sentiment]; if (s === undefined) continue; const a = sentAgg.get(ck) || { sum: 0, n: 0 }; a.sum += s; a.n++; sentAgg.set(ck, a); }
  const sentimentOf = (canon) => { const a = sentAgg.get(canon); return a && a.n ? a.sum / a.n : 0; };

  // résolus : gagné / perdu
  const resolved = [];
  let won = 0, lost = 0, wonAmountSum = 0, wonAmountN = 0;
  const segStats = new Map();
  for (const q of quotes) {
    const st = String(q.attributes?.state || '').toLowerCase();
    const hasOrder = quoteHasOrder.has(q.canonicalKey) || (q.aliasKeys || []).some((a) => quoteHasOrder.has(a));
    const ci = clientOfQuote.get(q.canonicalKey); const seg = ci ? ci.segment : 'inconnu';
    let label = null;
    if (WON.has(st) || (hasOrder && !LOST.has(st))) label = 1;
    else if (LOST.has(st)) label = 0;
    if (label === null) continue;                          // ouvert → pas back-testable
    const ss = segStats.get(seg) || { won: 0, lost: 0 }; if (label === 1) { won++; ss.won++; const amt = amountOf(q); if (amt > 0) { wonAmountSum += amt; wonAmountN++; } } else { lost++; ss.lost++; } segStats.set(seg, ss);
    resolved.push({ q, ci, seg, hasOrder, label });
  }

  const baseWinRate = (won + 1) / (won + lost + 2);
  const avgWonAmount = wonAmountN ? wonAmountSum / wonAmountN : 0;
  const segRate = new Map([...segStats.entries()].map(([s, v]) => [s, (v.won + 1) / (v.won + v.lost + 2)]));

  // RE-SCORE chaque devis résolu avec la même cote ajustée que le scorer de prod
  const pairs = [];
  for (const { q, ci, seg, hasOrder, label } of resolved) {
    const amount = amountOf(q);
    let odds = toOdds(segRate.has(seg) ? segRate.get(seg) : baseWinRate);
    if (avgWonAmount > 0 && amount > 0) odds *= clamp(1 / Math.sqrt(Math.max(0.25, amount / avgWonAmount)), 0.6, 1.4);
    const ageDays = dateOf(q) ? Math.max(0, (now - dateOf(q)) / DAY_S) : 0;
    odds *= clamp(1 - Math.max(0, ageDays - 30) / 180, 0.5, 1);
    odds *= clamp(1 + 0.25 * (ci ? sentimentOf(ci.canon) : 0), 0.7, 1.3);
    if (hasOrder) odds *= 6;
    const prob = clamp(fromOdds(odds), 0.02, 0.98);
    pairs.push({ score: prob, label });
  }

  const n = pairs.length;
  if (n < 6 || won === 0 || lost === 0) {
    return { name, n, auc: null, accuracy: accuracyAt(pairs), precisionAtK: null, brier: brier(pairs),
      note: `peu de devis résolus (${won} gagnés / ${lost} perdus) — AUC non significative` };
  }
  return {
    name, n,
    auc: aucRanked(pairs),
    accuracy: accuracyAt(pairs, 0.5),
    precisionAtK: precisionAtK(pairs, Math.min(5, won)),
    brier: brier(pairs),
    note: `${won} devis gagnés vs ${lost} perdus`,
  };
}

// ── 3) BACK-TEST CHURN (proxy) ───────────────────────────────────────────────
// Pas de vrai label d'attrition → proxy : client sans pièce ferme depuis `dormantDays` j
// = dormant (label 1). On appelle scoreChurn() (le vrai scorer de prod) et on mesure si son
// score sépare dormants vs actifs.
async function backtestChurn(RadarEntity, RadarRelation, workspaceId, { dormantDays = DEFAULT_DORMANT_DAYS, now = Date.now() } = {}) {
  const name = 'churn_proxy';
  const { scoreChurn } = require('./churn');

  // récence de la dernière pièce ferme par client (mêmes jointures que churn.js)
  const clients = await RadarEntity.find({ workspaceId, coreType: 'Party', roles: 'client' }).select('canonicalKey aliasKeys').lean();
  if (!clients.length) return { name, n: 0, auc: null, accuracy: null, precisionAtK: null, note: 'aucun client' };
  const canonOf = new Map(); const lastTx = new Map();
  for (const c of clients) { canonOf.set(c.canonicalKey, c.canonicalKey); for (const a of c.aliasKeys || []) canonOf.set(a, c.canonicalKey); lastTx.set(c.canonicalKey, 0); }

  const txs = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: { $in: ['order', 'invoice'] } }).select('canonicalKey aliasKeys attributes firstSeenAt').lean();
  const txByKey = new Map();
  for (const t of txs) { txByKey.set(t.canonicalKey, t); for (const a of t.aliasKeys || []) txByKey.set(a, t); }
  const partyRels = await RadarRelation.find({ workspaceId, type: 'party_of' }).select('fromKey toKey').lean();
  const txMs = (e) => { const d = num(e.attributes?.date); if (d > 0) return d * 1000; return e.firstSeenAt ? new Date(e.firstSeenAt).getTime() : 0; };
  for (const r of partyRels) { const cc = canonOf.get(r.toKey); if (!cc) continue; const tx = txByKey.get(r.fromKey); if (!tx) continue; const ms = txMs(tx); if (ms > (lastTx.get(cc) || 0)) lastTx.set(cc, ms); }

  // label proxy : dormant (1) si dernière pièce > dormantDays j OU aucune pièce
  const labelOf = new Map();
  for (const [cc, ms] of lastTx) { const days = ms ? (now - ms) / DAY : Infinity; labelOf.set(cc, days > dormantDays ? 1 : 0); }

  // scoreChurn de prod → score par clientKey (peut être canon ou alias)
  const churn = await scoreChurn(workspaceId, { staleDays: 180 });   // staleDays > dormantDays pour ne pas confondre score et label
  const pairs = [];
  for (const row of churn.all) {
    const cc = canonOf.get(row.clientKey) || row.clientKey;
    if (!labelOf.has(cc)) continue;
    pairs.push({ score: row.score, label: labelOf.get(cc) });
  }

  const n = pairs.length;
  const pos = pairs.filter((p) => p.label === 1).length, neg = n - pos;
  if (n < 4 || pos === 0 || neg === 0) {
    return { name, n, auc: null, accuracy: null, precisionAtK: null,
      note: `proxy peu discriminant (${pos} dormants / ${neg} actifs sur ${n}) — pas de vrai label d'attrition` };
  }
  return {
    name, n,
    auc: aucRanked(pairs),
    accuracy: accuracyAt(pairs, 0.5),
    precisionAtK: precisionAtK(pairs, Math.min(5, pos)),
    note: `proxy d'attrition : ${pos} clients dormants (>${dormantDays}j) vs ${neg} actifs`,
  };
}

/**
 * Back-teste les scorers prédictifs du Radar contre la vérité historique du workspace.
 * @param {ObjectId|string} workspaceId
 * @param {object} [opts] termsDays, dormantDays, now (injectable pour tests)
 * @returns {Promise<{ models:Array, overall:{ models:number, evaluated:number, avgAuc:number|null } }>}
 */
async function backtestModels(workspaceId, opts = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');

  const models = await Promise.all([
    backtestDso(RadarEntity, RadarRelation, workspaceId, opts),
    backtestWinrate(RadarEntity, RadarRelation, workspaceId, opts),
    backtestChurn(RadarEntity, RadarRelation, workspaceId, opts),
  ]);

  const withAuc = models.filter((m) => typeof m.auc === 'number');
  const overall = {
    models: models.length,
    evaluated: withAuc.length,
    avgAuc: withAuc.length ? round(mean(withAuc.map((m) => m.auc)), 3) : null,
  };
  return { models, overall };
}

module.exports = { backtestModels, aucRanked, accuracyAt, precisionAtK, brier };
