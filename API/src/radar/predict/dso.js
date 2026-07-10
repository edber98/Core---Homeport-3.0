// Radar — PRÉDICTION DU RETARD DE PAIEMENT / DSO (predict).
//
// Scoring HEURISTIQUE/STATISTIQUE transparent et déterministe du risque de retard
// de paiement, par client et par facture impayée. On reconstruit l'historique
// facture→paiement (relation `pays` paiement→facture) pour mesurer le DÉLAI DE
// RÈGLEMENT PASSÉ de chaque client, puis on projette ce comportement sur ses
// factures encore impayées. Aucun ML lourd : moyennes, variance, ratios, z-score.
//
// FEATURES (par client, depuis les factures déjà réglées) :
//   - avgDelayDays : délai moyen de règlement = date(paiement) − date(facture)
//   - stdDelayDays : écart-type des délais passés (régularité du payeur)
//   - lateRatio    : part des factures réglées APRÈS échéance (date_lim_reglement)
// FEATURES (par facture impayée, projetées) :
//   - daysOverdue  : ancienneté de la créance = jours depuis date_lim_reglement
//   - amount       : montant TTC (gros montants = risque pondéré plus haut)
//
// SCORE 0..1 par facture = combinaison logistique de :
//   - retard observé vs échéance (daysOverdue, normalisé)
//   - délai moyen historique du client (avgDelay vs termes)
//   - taux de retard historique du client (lateRatio)
//   - z-score du montant dans le portefeuille du client (gros = +risque)
// Score client = moyenne pondérée par montant des scores de ses factures impayées,
// relevé par son lateRatio historique. DSO global = délai moyen pondéré (jours).

const DAY = 86400000;
const DEFAULT_TERMS_DAYS = 30;   // termes de règlement par défaut si date_lim_reglement absente

const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
// dates en secondes unix (Dolibarr) → ms ; tolère déjà-ms
const toMs = (v) => { const n = num(v); if (!n) return 0; return n < 1e12 ? n * 1000 : n; };
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const round = (x, d = 2) => { const p = Math.pow(10, d); return Math.round(x * p) / p; };

const amountOf = (e) => num(e.attributes?.amount_total) || num(e.attributes?.total_ttc) || num(e.attributes?.amount);
const isPaid = (e) => e.attributes?.state === 'payée' || e.attributes?.payment_state === 'payée';
const isUnpaid = (e) => !isPaid(e) && e.attributes?.payment_state === 'impayée' && e.attributes?.state !== 'brouillon';

// date d'échéance : date_lim_reglement si présente, sinon date facture + termes
function dueMsOf(inv, termsDays) {
  const lim = toMs(inv.attributes?.date_lim_reglement);
  if (lim) return lim;
  const d = toMs(inv.attributes?.date);
  return d ? d + termsDays * DAY : 0;
}

/**
 * Score le risque de retard de paiement par client et par facture impayée.
 * @param workspaceId
 * @param opts.termsDays  termes de règlement par défaut (jours) si échéance absente
 * @param opts.now        horloge injectable (tests) — ms epoch
 * @returns {{ dsoGlobal, clients:[{client, score, avgDelayDays, outstanding}],
 *             invoicesAtRisk:[{label, client, score, daysOverdue, amount}] }}
 */
async function scorePaymentDelay(workspaceId, { termsDays = DEFAULT_TERMS_DAYS, now = Date.now() } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');

  // 1) Factures clients (toutes : réglées = historique, impayées = à scorer)
  const invoices = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'invoice' })
    .select('canonicalKey aliasKeys label subtype attributes').lean();
  if (!invoices.length) return { dsoGlobal: 0, clients: [], invoicesAtRisk: [] };

  // Résolution alias→canonique (une pièce peut être référencée par un alias dans les relations)
  const invByKey = new Map();
  for (const inv of invoices) { invByKey.set(inv.canonicalKey, inv); for (const a of inv.aliasKeys || []) invByKey.set(a, inv); }

  // 2) Clients (label + alias)
  const parties = await RadarEntity.find({ workspaceId, coreType: 'Party' })
    .select('canonicalKey aliasKeys label').lean();
  const partyByKey = new Map();
  const labelOf = new Map();
  for (const p of parties) { partyByKey.set(p.canonicalKey, p.canonicalKey); labelOf.set(p.canonicalKey, p.label); for (const a of p.aliasKeys || []) partyByKey.set(a, p.canonicalKey); }

  // 3) facture → client (relation party_of, role billed_to|client)
  const partyRels = await RadarRelation.find({ workspaceId, type: 'party_of' }).select('fromKey toKey').lean();
  const clientOfInvoice = new Map();   // invoiceCanon → clientCanon
  for (const r of partyRels) {
    const inv = invByKey.get(r.fromKey); if (!inv) continue;
    const ck = partyByKey.get(r.toKey) || r.toKey;
    if (!clientOfInvoice.has(inv.canonicalKey)) clientOfInvoice.set(inv.canonicalKey, ck);
  }

  // 4) paiements (date) + relation `pays` paiement→facture → date de règlement par facture
  const payments = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'payment' })
    .select('canonicalKey aliasKeys attributes').lean();
  const payByKey = new Map();
  for (const p of payments) { payByKey.set(p.canonicalKey, p); for (const a of p.aliasKeys || []) payByKey.set(a, p); }
  const paysRels = await RadarRelation.find({ workspaceId, type: 'pays' }).select('fromKey toKey').lean();
  const paidAtOf = new Map();   // invoiceCanon → date paiement ms (dernier paiement)
  for (const r of paysRels) {
    const inv = invByKey.get(r.toKey); if (!inv) continue;
    const pay = payByKey.get(r.fromKey); if (!pay) continue;
    const at = toMs(pay.attributes?.date);
    if (at && (!paidAtOf.has(inv.canonicalKey) || at > paidAtOf.get(inv.canonicalKey))) paidAtOf.set(inv.canonicalKey, at);
  }

  // 5) HISTORIQUE par client : délais de règlement passés (facture réglée)
  const hist = new Map();   // clientCanon → { delays:[], lateCount, settled }
  const globalDelays = [];
  for (const inv of invoices) {
    if (!isPaid(inv)) continue;
    const issued = toMs(inv.attributes?.date);
    const paidAt = paidAtOf.get(inv.canonicalKey) || issued;   // fallback : réglée à émission
    if (!issued || paidAt < issued) continue;
    const delay = Math.round((paidAt - issued) / DAY);
    const due = dueMsOf(inv, termsDays);
    const late = due ? paidAt > due : false;
    globalDelays.push(delay);
    const ck = clientOfInvoice.get(inv.canonicalKey);
    if (!ck) continue;
    const h = hist.get(ck) || { delays: [], lateCount: 0, settled: 0 };
    h.delays.push(delay); h.settled++; if (late) h.lateCount++;
    hist.set(ck, h);
  }

  const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
  const std = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length); };

  // profil de paiement par client (features historiques)
  const profile = new Map();   // clientCanon → { avgDelay, stdDelay, lateRatio, settled }
  for (const [ck, h] of hist) {
    profile.set(ck, { avgDelay: mean(h.delays), stdDelay: std(h.delays), lateRatio: h.settled ? h.lateCount / h.settled : 0, settled: h.settled });
  }
  const globalAvgDelay = mean(globalDelays);   // base de repli pour clients sans historique

  // montant moyen / écart-type par client (pour z-score montant des impayées)
  const amtByClient = new Map();
  for (const inv of invoices) { const ck = clientOfInvoice.get(inv.canonicalKey); if (!ck) continue; if (!amtByClient.has(ck)) amtByClient.set(ck, []); amtByClient.get(ck).push(amountOf(inv)); }

  // 6) SCORING des factures IMPAYÉES
  const invoicesAtRisk = [];
  const clientAgg = new Map();   // clientCanon → { weighted, outstanding, count }
  for (const inv of invoices) {
    if (!isUnpaid(inv)) continue;
    const ck = clientOfInvoice.get(inv.canonicalKey) || null;
    const prof = ck ? profile.get(ck) : null;
    const amount = amountOf(inv);
    const due = dueMsOf(inv, termsDays);
    const daysOverdue = due ? Math.max(0, Math.round((now - due) / DAY)) : 0;

    // feature 1 : retard observé vs échéance (créance courante)
    const fOverdue = clamp01(daysOverdue / 60);                    // 60j+ overdue ⇒ saturé
    // feature 2 : délai moyen historique du client vs termes
    const avgDelay = prof ? prof.avgDelay : globalAvgDelay;
    const fHistDelay = clamp01((avgDelay - termsDays) / termsDays); // règle souvent en retard ⇒ ↑
    // feature 3 : taux de retard historique
    const fLateRatio = prof ? prof.lateRatio : 0.3;                 // a priori prudent si inconnu
    // feature 4 : z-score du montant dans le portefeuille du client
    const amts = ck ? (amtByClient.get(ck) || []) : [];
    const zAmt = (() => { if (amts.length < 2) return 0; const m = mean(amts), s = std(amts); return s ? (amount - m) / s : 0; })();
    const fAmount = clamp01(zAmt / 3);                              // +3σ ⇒ saturé

    // combinaison logistique transparente (poids fixes, déterministes)
    const z = -1.2
      + 2.4 * fOverdue
      + 1.4 * fHistDelay
      + 1.6 * fLateRatio
      + 0.6 * fAmount;
    const score = round(clamp01(sigmoid(z)), 3);

    invoicesAtRisk.push({
      label: inv.label || inv.canonicalKey,
      client: ck ? (labelOf.get(ck) || ck) : null,
      score, daysOverdue, amount: round(amount),
    });

    const a = clientAgg.get(ck) || { weighted: 0, outstanding: 0, count: 0 };
    a.weighted += score * Math.max(amount, 1); a.outstanding += amount; a.count++;
    clientAgg.set(ck, a);
  }
  invoicesAtRisk.sort((x, y) => y.score - x.score || y.daysOverdue - x.daysOverdue);

  // 7) score agrégé par CLIENT (moyenne pondérée par montant, relevée du lateRatio historique)
  const clients = [...clientAgg.entries()].map(([ck, a]) => {
    const prof = ck ? profile.get(ck) : null;
    const base = a.outstanding > 0 ? a.weighted / Math.max(a.outstanding, a.count) : a.weighted / Math.max(a.count, 1);
    const lifted = clamp01(0.85 * base + 0.15 * (prof ? prof.lateRatio : 0.3));
    return {
      client: ck ? (labelOf.get(ck) || ck) : '(client inconnu)',
      score: round(lifted, 3),
      avgDelayDays: round(prof ? prof.avgDelay : globalAvgDelay, 1),
      outstanding: round(a.outstanding),
    };
  }).sort((x, y) => y.score - x.score || y.outstanding - x.outstanding);

  // 8) DSO global = délai moyen de règlement observé (jours)
  const dsoGlobal = round(globalAvgDelay, 1);

  return { dsoGlobal, clients, invoicesAtRisk };
}

module.exports = { scorePaymentDelay };
