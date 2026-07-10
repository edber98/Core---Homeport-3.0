// Radar — PRÉVISION DE TRÉSORERIE (predict/cashflow). Échéancier net à 30/60/90 jours,
// 100% HEURISTIQUE / STATISTIQUE et déterministe (médianes, ratios, décroissance
// logistique du recouvrement selon le retard). Aucune dépendance ML.
//
// ENCAISSEMENTS attendus = factures clients impayées × probabilité d'encaissement,
//   datées à leur ÉCHÉANCE PROBABLE = échéance contractuelle (date_lim_reglement, sinon
//   date + délai de paiement par défaut) repoussée du DÉLAI MOYEN d'encaissement du
//   client (médiane empirique paiement−émission sur ses factures déjà réglées).
// DÉCAISSEMENTS = factures fournisseurs impayées à leur échéance (date_lim_reglement
//   sinon date + délai par défaut).
//
// Probabilité d'encaissement : 1 pour une facture à échoir / juste due, décroît avec le
// RETARD (jours au-delà de l'échéance) via une courbe logistique transparente, bornée
// [0.35 ; 0.97]. Plus une créance traîne, moins on la compte comme cash certain.
//
// FEATURES exposées (champ `features`) : delais de paiement médians, taux d'encaissement
// observé, paramètres de la courbe de probabilité, délai de paiement par défaut.

const DAY = 86400;                 // 1 jour en secondes (les dates source sont en unix s)
const PAID = new Set(['payée', 'payee', 'paid']);

const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const median = (arr) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Montant TTC d'une pièce (amount_total, sinon total_ttc). */
function amountOf(a) { return num(a?.amount_total) || num(a?.total_ttc); }

/** Une facture est-elle réglée ? Gère 'payée' ET le brut Dolibarr (payment_state '1'/'2'). */
function isPaid(a) {
  const ps = String(a?.payment_state ?? '').toLowerCase();
  if (PAID.has(ps)) return true;
  // Dolibarr brut : payment_state '1' (payée) ou '2' (partiel) — '0' = impayée
  if (ps === '1' || ps === '2') return true;
  return false;
}
function isUnpaid(a) {
  const ps = String(a?.payment_state ?? '').toLowerCase();
  if (ps === 'impayée' || ps === 'impayee' || ps === '0') return true;
  return !isPaid(a) && ps !== '';   // état présent mais non « payé »
}

/** Échéance contractuelle : date_lim_reglement, sinon date d'émission + délai par défaut. */
function dueDate(a, defaultTermDays) {
  const dlr = num(a?.date_lim_reglement);
  if (dlr > 0) return dlr;
  const d = num(a?.date);
  return d > 0 ? d + defaultTermDays * DAY : 0;
}

/**
 * Courbe de probabilité d'encaissement selon le retard (jours au-delà de l'échéance).
 * À échéance (retard ≤ 0) → ~0.97 ; décroissance logistique centrée sur `halfLife`
 * jours de retard (point à 50% entre le plancher et le plafond). Déterministe.
 */
function collectionProb({ lateDays, floor = 0.35, ceil = 0.97, halfLife = 75, steepness = 0.045 }) {
  if (lateDays <= 0) return ceil;
  const logistic = 1 / (1 + Math.exp(steepness * (lateDays - halfLife)));   // 1→0 quand le retard grandit
  return Math.round((floor + (ceil - floor) * logistic) * 1000) / 1000;
}

/**
 * Prévision de trésorerie.
 * @param {ObjectId|string} workspaceId
 * @param {object} opts
 * @param {number} [opts.horizonDays=90]      horizon total (fenêtres = horizon/3, mini 30j)
 * @param {number} [opts.defaultTermDays=30]  délai de paiement par défaut si pas d'échéance
 * @returns {{ generatedAt, horizonDays, now, windows, expectedInflow, expectedOutflow,
 *             netPosition, inflows, outflows, features }}
 */
async function forecastCashflow(workspaceId, { horizonDays = 90, defaultTermDays = 30 } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');

  const nowSec = Math.floor(Date.now() / 1000);

  // ── Délai d'encaissement par défaut (réutilise ../forecast si dispo, en jours) ────────
  let baselineDelayDays = defaultTermDays;
  try {
    const { forecast } = require('../forecast');
    const f = await forecast(workspaceId);
    if (f && Number.isFinite(f.expectedDays) && f.expectedDays > 0) baselineDelayDays = f.expectedDays;
  } catch (_) { /* forecast indisponible → on reste sur l'heuristique locale */ }

  // ── Pièces clients ────────────────────────────────────────────────────────────────────
  const invoices = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'invoice' })
    .select('canonicalKey aliasKeys label attributes').lean();
  const payments = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'payment' })
    .select('canonicalKey aliasKeys attributes').lean();
  const suppliers = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'supplier_invoice' })
    .select('canonicalKey label attributes').lean();

  // index alias→canonique pour résoudre les relations
  const invByKey = new Map();
  for (const i of invoices) { invByKey.set(i.canonicalKey, i); for (const a of i.aliasKeys || []) invByKey.set(a, i); }
  const payByKey = new Map();
  for (const p of payments) { payByKey.set(p.canonicalKey, p); for (const a of p.aliasKeys || []) payByKey.set(a, p); }

  // facture → client (relation party_of role billed_to, sinon n'importe quel party_of)
  const partyRels = await RadarRelation.find({ workspaceId, type: 'party_of' }).select('fromKey toKey role').lean();
  const clientOfInvoice = new Map();   // invoiceCanon → clientKey
  for (const r of partyRels) {
    const inv = invByKey.get(r.fromKey); if (!inv) continue;
    if (!clientOfInvoice.has(inv.canonicalKey) || r.role === 'billed_to') clientOfInvoice.set(inv.canonicalKey, r.toKey);
  }

  // ── DÉLAI D'ENCAISSEMENT EMPIRIQUE par client (médiane paiement−émission) ──────────────
  const paysRels = await RadarRelation.find({ workspaceId, type: 'pays' }).select('fromKey toKey').lean();
  const delaysGlobal = [];
  const delaysByClient = new Map();    // clientKey → [days...]
  for (const r of paysRels) {
    const pay = payByKey.get(r.fromKey); const inv = invByKey.get(r.toKey);
    if (!pay || !inv) continue;
    const pd = num(pay.attributes?.date), id = num(inv.attributes?.date);
    if (pd <= 0 || id <= 0 || pd < id) continue;
    const d = Math.round((pd - id) / DAY);
    delaysGlobal.push(d);
    const ck = clientOfInvoice.get(inv.canonicalKey);
    if (ck) { const arr = delaysByClient.get(ck) || []; arr.push(d); delaysByClient.set(ck, arr); }
  }
  const globalDelay = median(delaysGlobal);            // null si aucun paiement historisé
  const clientDelayMed = new Map();
  for (const [ck, arr] of delaysByClient) clientDelayMed.set(ck, median(arr));

  // délai d'encaissement effectif retenu pour un client (empirique → global → baseline)
  const delayForClient = (ck) => {
    const c = ck != null ? clientDelayMed.get(ck) : null;
    if (Number.isFinite(c)) return c;
    if (Number.isFinite(globalDelay)) return globalDelay;
    return baselineDelayDays;
  };

  // taux d'encaissement observé (factures réglées / total facturé non-brouillon) — diagnostic
  let billedCount = 0, paidCount = 0;
  for (const inv of invoices) { const a = inv.attributes || {}; if (a.state === 'brouillon') continue; billedCount++; if (isPaid(a)) paidCount++; }
  const observedCollectionRate = billedCount ? Math.round((paidCount / billedCount) * 100) / 100 : null;

  // ── ENCAISSEMENTS attendus ────────────────────────────────────────────────────────────
  const inflows = [];
  let expectedInflow = 0;
  for (const inv of invoices) {
    const a = inv.attributes || {};
    if (a.state === 'brouillon') continue;          // brouillon = pas une créance ferme
    if (!isUnpaid(a)) continue;                      // on ne projette QUE les impayées
    const amount = amountOf(a);
    if (amount <= 0) continue;
    const ck = clientOfInvoice.get(inv.canonicalKey);
    const due = dueDate(a, defaultTermDays);
    const clientDelay = delayForClient(ck);
    // échéance probable = échéance contractuelle (au plus tôt aujourd'hui) + délai client
    const baseSec = Math.max(due > 0 ? due : nowSec, nowSec);
    const expectedSec = baseSec + Math.round(clientDelay * DAY);
    const lateDays = due > 0 ? Math.max(0, Math.round((nowSec - due) / DAY)) : 0;
    const prob = collectionProb({ lateDays });
    const expected = Math.round(amount * prob * 100) / 100;
    expectedInflow += expected;
    inflows.push({
      key: inv.canonicalKey, label: inv.label, type: 'invoice',
      amount: Math.round(amount), prob, expected,
      dueDate: due || null, expectedDate: expectedSec,
      etaDays: Math.round((expectedSec - nowSec) / DAY), lateDays,
      clientDelayDays: clientDelay,
    });
  }

  // ── DÉCAISSEMENTS (factures fournisseurs impayées, à leur échéance) ───────────────────
  const outflows = [];
  let expectedOutflow = 0;
  for (const s of suppliers) {
    const a = s.attributes || {};
    if (isPaid(a)) continue;                         // déjà réglée → pas de sortie
    const amount = amountOf(a);
    if (amount <= 0) continue;
    const due = dueDate(a, defaultTermDays);
    const expectedSec = Math.max(due > 0 ? due : nowSec, nowSec);   // dette due aujourd'hui au plus tôt
    expectedOutflow += amount;
    outflows.push({
      key: s.canonicalKey, label: s.label, type: 'supplier_invoice',
      amount: Math.round(amount), prob: 1, expected: Math.round(amount),
      dueDate: due || null, expectedDate: expectedSec,
      etaDays: Math.round((expectedSec - nowSec) / DAY),
    });
  }

  // ── ÉCHÉANCIER NET par fenêtre 30/60/90 (cumulatif sur l'horizon) ──────────────────────
  const step = Math.max(1, Math.round(horizonDays / 3));
  const bounds = [step, step * 2, Math.max(step * 3, horizonDays)];
  const windows = bounds.map((days, i) => {
    const label = `${days}j`;
    let inflow = 0, outflow = 0;
    for (const f of inflows) if (f.etaDays <= days) inflow += f.expected;
    for (const o of outflows) if (o.etaDays <= days) outflow += o.expected;
    inflow = Math.round(inflow); outflow = Math.round(outflow);
    return { label, days, inflow, outflow, net: inflow - outflow };
  });

  expectedInflow = Math.round(expectedInflow);
  expectedOutflow = Math.round(expectedOutflow);

  inflows.sort((a, b) => a.expectedDate - b.expectedDate);
  outflows.sort((a, b) => a.expectedDate - b.expectedDate);

  return {
    generatedAt: new Date().toISOString(),
    now: nowSec,
    horizonDays,
    windows,
    expectedInflow,
    expectedOutflow,
    netPosition: expectedInflow - expectedOutflow,
    inflows: inflows.slice(0, 100),
    outflows: outflows.slice(0, 100),
    features: {
      method: 'heuristic-deterministic',
      defaultTermDays,
      baselineDelayDays,
      globalCollectionDelayMedianDays: globalDelay,
      perClientCollectionDelay: clientDelayMed.size,
      observedCollectionRate,
      unpaidInvoices: inflows.length,
      unpaidSupplierInvoices: outflows.length,
      probCurve: { floor: 0.35, ceil: 0.97, halfLifeLateDays: 75, steepness: 0.045 },
      signals: ['amount_total/total_ttc', 'date_lim_reglement|date+terme', 'payment_state', 'pays(historique→délai médian)', 'party_of(client)'],
    },
  };
}

module.exports = { forecastCashflow };
