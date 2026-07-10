// Radar — PRÉDICTION DE TAUX DE CONVERSION devis→commande (win-rate).
//
// Objectif : pour chaque devis OUVERT (state 'brouillon'/'émis', ni gagné ni perdu),
// estimer la probabilité qu'il se transforme en commande (win), puis pondérer le CA.
//
// MÉTHODE — heuristique/statistique TRANSPARENTE et DÉTERMINISTE (pas de ML lourd) :
//  1) On apprend le TAUX DE BASE depuis l'historique des devis résolus :
//       gagné  = state ∈ {signé, accepté, gagné}  (ou commande déjà dérivée du devis)
//       perdu  = state ∈ {refusé, perdu, annulé}
//     base = gagnés / (gagnés + perdus), globalement ET par SEGMENT client (Laplace +1/+2
//     pour lisser les petits effectifs → pas de proba 0/1 sur 1 seul exemple).
//  2) Pour chaque devis ouvert, on part de la base (du segment si dispo, sinon globale)
//     puis on l'ajuste par des FEATURES via des multiplicateurs de cote (odds) bornés :
//       - amount_ratio : montant du devis / montant moyen des devis GAGNÉS
//                        (gros devis = plus dur à signer → cote↓ ; petit devis → cote↑)
//       - age_days     : ancienneté du devis (un devis qui traîne perd en probabilité)
//       - sentiment    : sentiment moyen des emails liés au client (positif↑ / négatif↓)
//       - hasOrder     : une commande est DÉJÀ dérivée de ce devis → quasi-gagné (cote↑↑)
//     proba finale = sigmoïde de la cote ajustée, bornée [0.02, 0.98].
//  3) weightedForecast = Σ (proba × montant) sur les devis ouverts = CA pondéré attendu.
//
// FEATURES exposées par devis : prob, amount, et le détail (base, ratios) reste interne
// mais traçable. Le module exporte UNE fonction async.

const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const DAY = 86400;            // secondes (les dates sont en unix s)

// états historiques résolus
const WON = new Set(['signé', 'signe', 'accepté', 'accepte', 'gagné', 'gagne']);
const LOST = new Set(['refusé', 'refuse', 'perdu', 'annulé', 'annule']);
// états OUVERTS (en cours, ni gagné ni perdu)
const OPEN = new Set(['brouillon', 'émis', 'emis', 'ouvert', 'en cours', 'validé', 'valide', 'envoyé', 'envoye']);

const amountOf = (e) => num(e.attributes?.amount_total) || num(e.attributes?.total_ttc);
const dateOf = (e) => num(e.attributes?.date) || (e.firstSeenAt ? Math.round(new Date(e.firstSeenAt).getTime() / 1000) : 0);

// proba ↔ cote (log-odds) pour combiner des multiplicateurs proprement
const toOdds = (p) => { const c = clamp(p, 0.001, 0.999); return c / (1 - c); };
const fromOdds = (o) => o / (1 + o);

/**
 * Probabilité de conversion devis→commande par devis ouvert + forecast pondéré.
 * @param {ObjectId|string} workspaceId
 * @returns {Promise<{ baseWinRate:number, bySegment:Array, openQuotes:Array, weightedForecast:number, sampleSize:object }>}
 */
async function scoreWinRate(workspaceId) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');

  const now = Math.round(Date.now() / 1000);

  // 1) tous les devis (résolus + ouverts)
  const quotes = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'quote' })
    .select('canonicalKey aliasKeys label attributes firstSeenAt').lean();
  if (!quotes.length) {
    return { baseWinRate: 0, bySegment: [], openQuotes: [], weightedForecast: 0, sampleSize: { won: 0, lost: 0, open: 0 } };
  }

  // index devis (canonique + alias) → état/segment résolu plus bas
  const quoteKeys = new Set();
  for (const q of quotes) { quoteKeys.add(q.canonicalKey); for (const a of q.aliasKeys || []) quoteKeys.add(a); }

  // 2) clients + segment, via party_of (devis → client)
  const clients = await RadarEntity.find({ workspaceId, coreType: 'Party', roles: 'client' })
    .select('canonicalKey aliasKeys label attributes').lean();
  const clientInfo = new Map();   // anyKey → { label, segment, segmentLabel, canon }
  for (const c of clients) {
    const info = { label: c.label, canon: c.canonicalKey, segment: c.attributes?.segment || 'inconnu', segmentLabel: c.attributes?.segmentLabel || c.attributes?.segment || 'Inconnu' };
    clientInfo.set(c.canonicalKey, info);
    for (const a of c.aliasKeys || []) clientInfo.set(a, info);
  }
  const partyRels = await RadarRelation.find({ workspaceId, type: 'party_of', role: 'client' })
    .select('fromKey toKey').lean();
  const clientOfQuote = new Map();   // quoteKey → clientInfo
  for (const r of partyRels) {
    if (quoteKeys.has(r.fromKey)) { const ci = clientInfo.get(r.toKey); if (ci) clientOfQuote.set(r.fromKey, ci); }
  }

  // 3) commandes déjà dérivées d'un devis (order --derived_from--> quote)
  const derived = await RadarRelation.find({ workspaceId, type: 'derived_from' }).select('fromKey toKey').lean();
  const quoteHasOrder = new Set();   // quoteKey ayant au moins une commande dérivée
  for (const r of derived) { if (quoteKeys.has(r.toKey)) quoteHasOrder.add(r.toKey); }

  // 4) sentiment moyen par client : emails liés (references/party_of) → score [-1..1]
  const emails = await RadarEntity.find({ workspaceId, coreType: 'Communication', subtype: 'email' })
    .select('canonicalKey attributes').lean();
  const SENT = { 'positif': 1, 'neutre': 0, 'négatif': -1, 'negatif': -1 };
  const emailRels = await RadarRelation.find({ workspaceId, type: { $in: ['references', 'party_of'] } }).select('fromKey toKey').lean();
  const clientOfEmail = new Map();
  const clientCanonKeys = new Set([...clientInfo.values()].map((c) => c.canon));
  for (const r of emailRels) { if (clientCanonKeys.has(r.toKey) && !clientOfEmail.has(r.fromKey)) clientOfEmail.set(r.fromKey, r.toKey); }
  const sentAgg = new Map();   // clientCanon → { sum, n }
  for (const e of emails) {
    const ck = clientOfEmail.get(e.canonicalKey); if (!ck) continue;
    const s = SENT[e.attributes?.sentiment]; if (s === undefined) continue;
    const a = sentAgg.get(ck) || { sum: 0, n: 0 }; a.sum += s; a.n += 1; sentAgg.set(ck, a);
  }
  const sentimentOf = (canon) => { const a = sentAgg.get(canon); return a && a.n ? a.sum / a.n : 0; };

  // ── APPRENTISSAGE DU TAUX DE BASE ──────────────────────────────────────────
  // classement gagné/perdu/ouvert. Un devis 'ouvert' mais avec commande dérivée = gagné.
  let won = 0, lost = 0;
  let wonAmountSum = 0, wonAmountN = 0;
  const segStats = new Map();   // segment → { won, lost }
  const open = [];
  for (const q of quotes) {
    const st = String(q.attributes?.state || '').toLowerCase();
    const ci = clientOfQuote.get(q.canonicalKey);
    const seg = ci ? ci.segment : 'inconnu';
    const hasOrder = quoteHasOrder.has(q.canonicalKey) || (q.aliasKeys || []).some((a) => quoteHasOrder.has(a));
    const ss = segStats.get(seg) || { won: 0, lost: 0, segmentLabel: ci ? ci.segmentLabel : 'Inconnu' };

    if (WON.has(st) || (hasOrder && !LOST.has(st))) {
      won++; ss.won++; const amt = amountOf(q); if (amt > 0) { wonAmountSum += amt; wonAmountN++; }
      segStats.set(seg, ss);
    } else if (LOST.has(st)) {
      lost++; ss.lost++; segStats.set(seg, ss);
    } else if (OPEN.has(st) || !st) {
      open.push({ q, ci, seg, hasOrder });
    } else {
      // état inconnu non résolu → traité comme ouvert (prudent)
      open.push({ q, ci, seg, hasOrder });
    }
  }

  // taux de base global lissé (Laplace) — évite 0/1 sur petits N
  const baseWinRate = Math.round(((won + 1) / (won + lost + 2)) * 1000) / 1000;
  const avgWonAmount = wonAmountN ? wonAmountSum / wonAmountN : 0;

  // taux par segment lissé
  const bySegment = [...segStats.entries()].map(([segment, s]) => ({
    segment,
    segmentLabel: s.segmentLabel,
    winRate: Math.round(((s.won + 1) / (s.won + s.lost + 2)) * 1000) / 1000,
    won: s.won, lost: s.lost,
  })).sort((a, b) => b.winRate - a.winRate);
  const segRate = new Map(bySegment.map((s) => [s.segment, s.winRate]));

  // ── SCORING DES DEVIS OUVERTS ──────────────────────────────────────────────
  const openQuotes = [];
  let weightedForecast = 0;
  for (const { q, ci, seg, hasOrder } of open) {
    const amount = amountOf(q);
    // base = segment si on a un signal, sinon globale
    const base = segRate.has(seg) ? segRate.get(seg) : baseWinRate;
    let odds = toOdds(base);

    // feature 1 — taille relative du devis vs montant moyen gagné
    if (avgWonAmount > 0 && amount > 0) {
      const ratio = amount / avgWonAmount;
      // gros devis (ratio>1) → cote↓, petit devis → cote↑ ; effet borné [0.6, 1.4]
      const f = clamp(1 / Math.sqrt(Math.max(0.25, ratio)), 0.6, 1.4);
      odds *= f;
    }

    // feature 2 — ancienneté : décroissance douce après ~30j, plancher à 0.5×
    const ageDays = q && dateOf(q) ? Math.max(0, (now - dateOf(q)) / DAY) : 0;
    const ageFactor = clamp(1 - Math.max(0, ageDays - 30) / 180, 0.5, 1);
    odds *= ageFactor;

    // feature 3 — sentiment client : ±25% de cote par point de sentiment
    const sent = ci ? sentimentOf(ci.canon) : 0;
    odds *= clamp(1 + 0.25 * sent, 0.7, 1.3);

    // feature 4 — commande déjà liée → quasi-gagné
    if (hasOrder) odds *= 6;

    const prob = clamp(Math.round(fromOdds(odds) * 1000) / 1000, 0.02, 0.98);
    weightedForecast += prob * amount;

    openQuotes.push({
      label: q.label || q.attributes?.number || q.canonicalKey,
      client: ci ? ci.label : null,
      segment: seg,
      prob,
      amount: Math.round(amount),
      features: {
        base,
        amountRatio: avgWonAmount > 0 ? Math.round((amount / avgWonAmount) * 100) / 100 : null,
        ageDays: Math.round(ageDays),
        sentiment: Math.round(sent * 100) / 100,
        hasLinkedOrder: !!hasOrder,
      },
    });
  }
  openQuotes.sort((a, b) => b.prob - a.prob);

  return {
    baseWinRate,
    bySegment,
    openQuotes,
    weightedForecast: Math.round(weightedForecast),
    sampleSize: { won, lost, open: open.length, avgWonAmount: Math.round(avgWonAmount) },
  };
}

module.exports = { scoreWinRate };
