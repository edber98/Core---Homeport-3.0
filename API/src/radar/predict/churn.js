// Radar — PRÉDICTION D'ATTRITION (CHURN) par client B2B.
//
// Pour chaque client (Party.organization role=client) on calcule un score de risque
// d'attrition 0..1 par AGRÉGATION PONDÉRÉE de signaux HEURISTIQUES, transparents et
// déterministes (pas de ML : ratios, récences, tendances) — chaque feature est
// explicitée et son poids documenté. Le score combine :
//
//   1. RÉCENCE  (recencyRisk)   : jours depuis la dernière commande/facture.
//        Un client qui n'a rien commandé depuis longtemps « s'endort ». Rampe
//        linéaire 0→1 entre 0 et `staleDays` jours (défaut 120).
//   2. TENDANCE (trendRisk)     : volume des commandes récentes vs anciennes
//        (montant cumulé sur la 2e moitié de la période / 1re moitié). Une chute
//        de volume = désengagement. Ratio < 1 ⇒ risque.
//   3. TICKETS  (ticketRisk)    : nombre de tickets/incidents ouverts + tonalité
//        négative associée. Beaucoup de friction support = insatisfaction.
//   4. SENTIMENT(sentimentRisk) : part d'emails négatifs du client (ratio neg/total).
//   5. IMPAYÉS  (overdueRisk)   : factures impayées en retard (montant + ancienneté).
//        Un client qui ne paie plus est en voie de rupture.
//
// Résolution alias→canonique : les relations pointent souvent vers les aliasKeys
// (`dolibarr:party:N`) alors que la Party a une canonicalKey forte (`email:...`).
// On construit une Map alias→canonique pour ramener chaque arête sur le bon client.

const DAY = 86400000;

const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const r2 = (x) => Math.round(x * 100) / 100;

// `date` des transactions/emails = epoch secondes ; firstSeenAt = fallback.
function txMs(e) {
  const d = num(e.attributes?.date);
  if (d > 0) return d * 1000;
  return e.firstSeenAt ? new Date(e.firstSeenAt).getTime() : 0;
}
function amountOf(e) { return num(e.attributes?.amount_total) || num(e.attributes?.total_ttc) || num(e.attributes?.amount); }

/**
 * Score de churn par client B2B.
 * @param {ObjectId|string} workspaceId
 * @param {object} [opts]
 * @param {number} [opts.staleDays=120]   plafond de récence (jours) → recencyRisk=1
 * @param {number} [opts.paymentTermDays=30] délai de paiement présumé (faute de date_lim_reglement)
 * @param {number} [opts.atRiskThreshold=0.5] seuil de classement « à risque »
 * @returns {{ atRisk:[{client, clientKey, score, reason, lastOrderDays, recentNegativeRatio, features}], all:[...], summary:{clients, clientsAtRisk, avgScore} }}
 */
async function scoreChurn(workspaceId, { staleDays = 120, paymentTermDays = 30, atRiskThreshold = 0.5 } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');
  const now = Date.now();

  // --- 1. Clients + table de résolution alias → canonique ---------------------
  const clients = await RadarEntity.find({ workspaceId, coreType: 'Party', roles: 'client' })
    .select('canonicalKey aliasKeys label attributes').lean();
  const canonOf = new Map();              // toute clé (canon ou alias) → canon
  const client = new Map();               // canon → { label, ... agrégats }
  for (const c of clients) {
    canonOf.set(c.canonicalKey, c.canonicalKey);
    for (const a of c.aliasKeys || []) canonOf.set(a, c.canonicalKey);
    client.set(c.canonicalKey, {
      label: c.label || c.canonicalKey,
      orderDates: [], orderAmounts: [],   // (ms, montant) des pièces fermes
      lastTxMs: 0,
      tickets: 0, ticketNeg: 0,
      emails: 0, emailNeg: 0,
      overdueCount: 0, overdueAmount: 0,
    });
  }
  if (!client.size) return { atRisk: [], all: [], summary: { clients: 0, clientsAtRisk: 0, avgScore: 0 } };

  // --- 2. Pièces commerciales (commandes + factures) → récence & tendance -----
  const txs = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: { $in: ['order', 'invoice'] } })
    .select('canonicalKey aliasKeys subtype attributes firstSeenAt').lean();
  const txByKey = new Map();
  for (const t of txs) { txByKey.set(t.canonicalKey, t); for (const a of t.aliasKeys || []) txByKey.set(a, t); }

  // party_of role billed_to/client relie la pièce (fromKey) → client (toKey alias/canon)
  const partyRels = await RadarRelation.find({ workspaceId, type: 'party_of' }).select('fromKey toKey').lean();
  const clientOfTx = new Map();           // txCanon → clientCanon
  for (const r of partyRels) {
    const cc = canonOf.get(r.toKey); if (!cc) continue;
    const tx = txByKey.get(r.fromKey); if (!tx) continue;
    clientOfTx.set(tx.canonicalKey, cc);
  }
  for (const t of txs) {
    const cc = clientOfTx.get(t.canonicalKey); if (!cc) continue;
    const c = client.get(cc); if (!c) continue;
    const ms = txMs(t); if (!ms) continue;
    c.orderDates.push(ms); c.orderAmounts.push(amountOf(t));
    if (ms > c.lastTxMs) c.lastTxMs = ms;
  }

  // --- 3. Factures IMPAYÉES EN RETARD -----------------------------------------
  const invs = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'invoice' })
    .select('canonicalKey aliasKeys attributes firstSeenAt').lean();
  for (const inv of invs) {
    if (inv.attributes?.payment_state !== 'impayée') continue;
    const cc = clientOfTx.get(inv.canonicalKey); if (!cc) continue;
    const c = client.get(cc); if (!c) continue;
    // due = date_lim_reglement si présent, sinon date facture + délai présumé
    const lim = num(inv.attributes?.date_lim_reglement);
    const dueMs = lim > 0 ? lim * 1000 : txMs(inv) + paymentTermDays * DAY;
    if (dueMs && now > dueMs) { c.overdueCount++; c.overdueAmount += amountOf(inv); }
  }

  // --- 4. Tickets de support par client + tonalité ----------------------------
  const tickets = await RadarEntity.find({ workspaceId, coreType: 'WorkItem', subtype: { $in: ['ticket', 'task'] } })
    .select('canonicalKey aliasKeys attributes').lean();
  const ticketByKey = new Map();
  for (const tk of tickets) { ticketByKey.set(tk.canonicalKey, tk); for (const a of tk.aliasKeys || []) ticketByKey.set(a, tk); }
  for (const r of partyRels) {
    const cc = canonOf.get(r.toKey); if (!cc) continue;
    const tk = ticketByKey.get(r.fromKey); if (!tk) continue;
    const c = client.get(cc); if (!c) continue;
    c.tickets++;
    const st = String(tk.attributes?.status || '').toLowerCase();
    const pr = String(tk.attributes?.priority || '').toUpperCase();
    if (pr === 'HIGH' || pr === 'CRITICAL' || /bloqu|urgent|incident/i.test(`${tk.label || ''} ${st}`)) c.ticketNeg++;
  }

  // --- 5. Sentiment des emails par client -------------------------------------
  const emails = await RadarEntity.find({ workspaceId, coreType: 'Communication', subtype: 'email' })
    .select('canonicalKey attributes').lean();
  // references role 'client' relie l'email → client (toKey = canon client directement)
  const refRels = await RadarRelation.find({ workspaceId, type: { $in: ['references', 'party_of'] }, role: 'client' })
    .select('fromKey toKey').lean();
  const clientOfEmail = new Map();
  for (const r of refRels) { const cc = canonOf.get(r.toKey); if (cc && !clientOfEmail.has(r.fromKey)) clientOfEmail.set(r.fromKey, cc); }
  for (const e of emails) {
    const cc = clientOfEmail.get(e.canonicalKey); if (!cc) continue;
    const c = client.get(cc); if (!c) continue;
    c.emails++;
    if (e.attributes?.sentiment === 'négatif') c.emailNeg++;
  }

  // --- 6. Scoring : features → score pondéré, motif principal ------------------
  // Poids (somme=1) : récence + tendance dominent (signaux d'engagement),
  // puis sentiment, tickets, impayés (signaux de friction).
  const W = { recency: 0.30, trend: 0.25, sentiment: 0.18, tickets: 0.12, overdue: 0.15 };

  const rows = [];
  for (const [key, c] of client) {
    const lastOrderDays = c.lastTxMs ? Math.round((now - c.lastTxMs) / DAY) : null;

    // 1) RÉCENCE : rampe 0→1 sur staleDays. Sans aucune commande → risque maximal.
    const recencyRisk = c.lastTxMs ? clamp01(lastOrderDays / staleDays) : 1;

    // 2) TENDANCE : montant récent (2e moitié de la période globale) vs ancien.
    //    On coupe la fenêtre d'activité du client à sa médiane temporelle.
    let trendRisk = 0, recentAmt = 0, oldAmt = 0;
    if (c.orderDates.length >= 2) {
      const lo = Math.min(...c.orderDates), hi = Math.max(...c.orderDates), mid = (lo + hi) / 2;
      for (let i = 0; i < c.orderDates.length; i++) {
        if (c.orderDates[i] >= mid) recentAmt += c.orderAmounts[i]; else oldAmt += c.orderAmounts[i];
      }
      // ratio récent/ancien : 1 = stable, 0 = effondrement. risk = 1 - ratio plafonné à 1.
      const ratio = oldAmt > 0 ? recentAmt / oldAmt : 1;
      trendRisk = clamp01(1 - Math.min(ratio, 1));
    } else if (c.orderDates.length === 1) {
      trendRisk = 0.3;   // une seule commande : engagement faible mais indéterminé
    } else {
      trendRisk = 0.5;   // aucune pièce commerciale : neutre-haut
    }

    // 3) SENTIMENT : ratio d'emails négatifs (0 si pas d'emails).
    const recentNegativeRatio = c.emails > 0 ? r2(c.emailNeg / c.emails) : 0;
    const sentimentRisk = recentNegativeRatio;

    // 4) TICKETS : friction support. Saturation à 4 tickets ; les tickets négatifs
    //    (urgents/incidents) comptent double.
    const ticketLoad = c.tickets + c.ticketNeg;
    const ticketRisk = clamp01(ticketLoad / 4);

    // 5) IMPAYÉS : présence d'au moins une facture en retard → risque ; saturation à 3.
    const overdueRisk = clamp01(c.overdueCount / 3);

    const features = {
      recencyRisk: r2(recencyRisk), trendRisk: r2(trendRisk), sentimentRisk: r2(sentimentRisk),
      ticketRisk: r2(ticketRisk), overdueRisk: r2(overdueRisk),
    };
    const score = r2(clamp01(
      W.recency * recencyRisk + W.trend * trendRisk + W.sentiment * sentimentRisk +
      W.tickets * ticketRisk + W.overdue * overdueRisk,
    ));

    // Motif principal = feature qui CONTRIBUE le plus (poids × valeur), avec libellé clair.
    const contrib = [
      ['recency', W.recency * recencyRisk, lastOrderDays != null ? `Aucune commande depuis ${lastOrderDays} j` : 'Aucune commande enregistrée'],
      ['trend', W.trend * trendRisk, `Volume de commandes en baisse (récent ${Math.round(recentAmt)}€ vs ancien ${Math.round(oldAmt)}€)`],
      ['sentiment', W.sentiment * sentimentRisk, `${c.emailNeg}/${c.emails} emails négatifs (${Math.round(recentNegativeRatio * 100)}%)`],
      ['tickets', W.tickets * ticketRisk, `${c.tickets} ticket(s) support, dont ${c.ticketNeg} critique(s)`],
      ['overdue', W.overdue * overdueRisk, `${c.overdueCount} facture(s) impayée(s) en retard (${Math.round(c.overdueAmount)}€)`],
    ].sort((a, b) => b[1] - a[1]);
    const reason = contrib[0][1] > 0 ? contrib[0][2] : 'Aucun signal de risque marqué';

    rows.push({
      client: c.label, clientKey: key, score, reason,
      lastOrderDays, recentNegativeRatio,
      overdueCount: c.overdueCount, tickets: c.tickets, orders: c.orderDates.length,
      features,
    });
  }

  rows.sort((a, b) => b.score - a.score);
  const atRisk = rows.filter((r) => r.score >= atRiskThreshold);
  const avgScore = rows.length ? r2(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0;

  return {
    atRisk,
    all: rows,
    summary: { clients: rows.length, clientsAtRisk: atRisk.length, avgScore },
  };
}

module.exports = { scoreChurn };
