// Radar — CUSTOMER HEALTH SCORE 360 (predict/health.js).
//
// Pour chaque client, on calcule une NOTE UNIQUE 0..100 (santé de la relation :
// 100 = excellent/opportunité, 0 = critique/risque de perte) en AGRÉGEANT plusieurs
// signaux issus des analyseurs existants du Radar, RÉUTILISÉS quand ils sont présents
// (require + try/catch — churn et dso n'existent pas encore, on dégrade proprement) :
//
//   - churn        ./churn        scoreChurn(ws)        → probabilité de perte du client
//   - retard       ./dso          scorePaymentDelay(ws) → retard moyen de paiement (DSO)
//   - sentiment    ../sentiment   analyzeSentiment(ws)  → tonalité des emails par client
//   - marge        ../margin      analyzeMargins(ws)    → rentabilité des affaires
//   - volume       (graphe)       CA total facturé par client (signal interne)
//
// SCORING 100% HEURISTIQUE / STATISTIQUE, transparent et déterministe : chaque signal
// est normalisé en sous-score 0..100, puis combiné par moyenne pondérée. Le signal le
// plus PÉNALISANT (le plus bas, hors volume) devient le `topSignal` qui détermine la
// NEXT-BEST-ACTION. La tendance compare le 1er vs le 2nd semestre de l'historique CA.
//
// Résolution alias→canonique : les relations portent les clés fournisseur
// (`dolibarr:party:10`, `dolibarr:customer_invoice:15`) tandis que les entités ont une
// `canonicalKey` (`email:…`) + des `aliasKeys`. On indexe TOUTE clé → entité canonique.

const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n) => Math.round(n);

/** Charge un analyseur de façon défensive : require + exécution sous try/catch.
 *  Retourne null si le module est absent (pas encore écrit) ou s'il échoue. */
async function safeRun(loader, label) {
  let mod;
  try { mod = loader(); } catch (_e) { return null; } // module absent → dégradation propre
  try { return await mod(); } catch (e) { console.warn(`[health] ${label} a échoué:`, e.message); return null; }
}

/**
 * CUSTOMER HEALTH SCORE 360 par client.
 * @param {ObjectId|string} workspaceId
 * @returns {Promise<{clients, distribution, signalsUsed, weights}>}
 */
async function customerHealth(workspaceId) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');

  // ---------- clients + index alias→canonique ----------
  const clients = await RadarEntity.find({ workspaceId, coreType: 'Party', roles: 'client' })
    .select('canonicalKey aliasKeys label attributes').lean();
  if (!clients.length) {
    return { clients: [], distribution: { sain: 0, surveiller: 0, risque: 0 }, signalsUsed: [], weights: {} };
  }
  const canonOfKey = new Map();   // toute clé (canon ou alias) → canonicalKey du client
  const clientOf = new Map();     // canonicalKey → { label, attributes }
  for (const c of clients) {
    clientOf.set(c.canonicalKey, c);
    canonOfKey.set(c.canonicalKey, c.canonicalKey);
    for (const a of c.aliasKeys || []) canonOfKey.set(a, c.canonicalKey);
  }

  // ---------- VOLUME D'AFFAIRES : CA facturé par client (signal interne) ----------
  // index transaction(alias)→canonical pour relier les relations party_of aux pièces
  const txs = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: { $in: ['invoice'] } })
    .select('canonicalKey aliasKeys label attributes firstSeenAt').lean();
  const txByKey = new Map();
  for (const t of txs) { txByKey.set(t.canonicalKey, t); for (const a of t.aliasKeys || []) txByKey.set(a, t); }

  // relation pièce → client (party_of, role billed_to/client)
  const partyRels = await RadarRelation.find({ workspaceId, type: 'party_of' }).select('fromKey toKey').lean();
  const clientOfTx = new Map(); // txCanonical → clientCanonical
  for (const r of partyRels) {
    const tx = txByKey.get(r.fromKey); if (!tx) continue;
    const ck = canonOfKey.get(r.toKey); if (!ck) continue;
    if (!clientOfTx.has(tx.canonicalKey)) clientOfTx.set(tx.canonicalKey, ck);
  }

  // CA + historique daté par client (pour la tendance)
  const volByClient = new Map(); // ck → { revenue, dates:[{ts,amt}] }
  for (const t of txs) {
    const ck = clientOfTx.get(t.canonicalKey); if (!ck) continue;
    const amt = num(t.attributes?.amount_total || t.attributes?.total_ttc);
    const ts = num(t.attributes?.date) ? num(t.attributes.date) * 1000 : new Date(t.firstSeenAt || 0).getTime();
    const v = volByClient.get(ck) || { revenue: 0, dates: [] };
    v.revenue += amt; if (ts) v.dates.push({ ts, amt }); volByClient.set(ck, v);
  }
  const revenues = [...volByClient.values()].map(v => v.revenue).filter(r => r > 0);
  const maxRev = revenues.length ? Math.max(...revenues) : 0;

  // ---------- SIGNAUX RÉUTILISÉS (analyseurs existants, défensifs) ----------
  const signalsUsed = [];
  const churnRes = await safeRun(() => require('./churn').scoreChurn.bind(null, workspaceId), 'churn');
  if (churnRes) signalsUsed.push('churn');
  const dsoRes = await safeRun(() => require('./dso').scorePaymentDelay.bind(null, workspaceId), 'dso');
  if (dsoRes) signalsUsed.push('paymentDelay');
  const sentRes = await safeRun(() => require('../sentiment').analyzeSentiment.bind(null, workspaceId), 'sentiment');
  if (sentRes) signalsUsed.push('sentiment');
  const marginRes = await safeRun(() => require('../margin').analyzeMargins.bind(null, workspaceId), 'margin');
  if (marginRes) signalsUsed.push('margin');
  if (volByClient.size) signalsUsed.push('volume');

  // ---- indexer les sorties des analyseurs par client canonique ----
  // churn : on tolère plusieurs formes ({clients:[{clientKey,prob}]} ou {byClient:[...]})
  const churnByClient = new Map();
  for (const row of (churnRes?.clients || churnRes?.byClient || [])) {
    const key = canonOfKey.get(row.clientKey || row.key || row.client) || row.clientKey || row.key;
    const prob = row.churnProb ?? row.prob ?? row.probability ?? row.score;
    if (key != null && prob != null) churnByClient.set(key, num(prob) > 1 ? num(prob) / 100 : num(prob));
  }
  // dso : retard moyen en jours par client
  const delayByClient = new Map();
  for (const row of (dsoRes?.clients || dsoRes?.byClient || [])) {
    const key = canonOfKey.get(row.clientKey || row.key || row.client) || row.clientKey || row.key;
    const days = row.dso ?? row.avgDelayDays ?? row.delayDays ?? row.days;
    if (key != null && days != null) delayByClient.set(key, num(days));
  }
  // sentiment : byClient porte clientKey + score (-1..1)
  const sentByClient = new Map();
  for (const row of (sentRes?.byClient || [])) {
    const key = canonOfKey.get(row.clientKey) || row.clientKey;
    if (key != null) sentByClient.set(key, { score: num(row.score), negatives: row.negatives || 0, atRisk: !!row.atRisk });
  }
  // marge : analyzeMargins renvoie des deals par pièce → on agrège par client via clientOfTx
  const marginByClient = new Map(); // ck → { revenue, margin }
  for (const d of (marginRes?.deals || [])) {
    const tx = txByKey.get(d.key); const ck = tx ? clientOfTx.get(tx.canonicalKey) : null; if (!ck) continue;
    const agg = marginByClient.get(ck) || { revenue: 0, margin: 0 };
    agg.revenue += num(d.revenue); agg.margin += num(d.margin); marginByClient.set(ck, agg);
  }

  // ---------- SOUS-SCORES 0..100 par signal (heuristiques explicites) ----------
  // Poids relatifs : fidélité/risque dominent, volume module l'enjeu.
  const WEIGHTS = { churn: 0.30, paymentDelay: 0.20, sentiment: 0.20, margin: 0.15, volume: 0.15 };

  const out = [];
  for (const c of clients) {
    const ck = c.canonicalKey;
    const sub = {};      // sous-scores 0..100 (100 = bon)
    const detail = {};   // valeurs brutes (transparence)

    // CHURN : sous-score = (1 - prob) * 100
    if (churnByClient.has(ck)) { const p = clamp(churnByClient.get(ck), 0, 1); sub.churn = round((1 - p) * 100); detail.churnProb = Math.round(p * 100) / 100; }
    // RETARD PAIEMENT : 0j → 100 ; pénalité linéaire, saturée à 60j → 0
    if (delayByClient.has(ck)) { const d = Math.max(0, delayByClient.get(ck)); sub.paymentDelay = round(clamp(100 - (d / 60) * 100)); detail.delayDays = round(d); }
    // SENTIMENT : score -1..1 → 0..100 (0 → 50)
    if (sentByClient.has(ck)) { const s = sentByClient.get(ck); sub.sentiment = round(clamp((s.score + 1) / 2 * 100)); detail.sentiment = s.score; detail.negatives = s.negatives; }
    // MARGE : taux de marge 0%→0, 40%+→100 (saturation)
    if (marginByClient.has(ck)) { const mg = marginByClient.get(ck); const rate = mg.revenue > 0 ? mg.margin / mg.revenue : 0; sub.margin = round(clamp(rate / 0.40 * 100)); detail.marginRate = Math.round(rate * 100); }
    // VOLUME : part du CA du client vs le plus gros client (z-score relatif simple)
    const vol = volByClient.get(ck);
    if (vol && maxRev > 0) { sub.volume = round(clamp((vol.revenue / maxRev) * 100)); detail.revenue = round(vol.revenue); }
    else { detail.revenue = 0; }

    // ---------- AGRÉGATION : moyenne pondérée sur les signaux DISPONIBLES ----------
    let wSum = 0, acc = 0;
    for (const [sig, w] of Object.entries(WEIGHTS)) { if (sub[sig] != null) { acc += sub[sig] * w; wSum += w; } }
    const health = wSum > 0 ? round(acc / wSum) : 50; // neutre si aucun signal

    // ---------- SIGNAL DOMINANT (le plus pénalisant, hors volume) ----------
    // → c'est lui qui dicte la next-best-action.
    let topSignal = null, topVal = Infinity;
    for (const sig of ['churn', 'paymentDelay', 'sentiment', 'margin']) {
      if (sub[sig] != null && sub[sig] < topVal) { topVal = sub[sig]; topSignal = sig; }
    }
    // si tout va bien (signal dominant élevé) ou aucun signal de risque, on bascule sur l'opportunité
    if (topSignal == null || topVal >= 70) {
      topSignal = (sub.volume != null && sub.volume >= 60) ? 'volume' : (topSignal || 'volume');
    }

    // ---------- NEXT-BEST-ACTION : déterminée par le signal dominant ----------
    const ACTION = {
      churn: 'fidéliser',        // risque de perte → programme de rétention
      paymentDelay: 'relancer',  // paie en retard → relance / recouvrement
      sentiment: 'escalader',    // mécontentement → escalade relation client
      margin: 'escalader',       // marge faible → renégocier / arbitrer
      volume: health >= 65 ? 'upseller' : 'fidéliser', // sain & gros → upsell, sinon entretenir
    };
    let nextBestAction = ACTION[topSignal] || 'fidéliser';
    // un client globalement sain dont le pire signal reste bon → on pousse l'upsell
    if (health >= 70 && topVal >= 70) nextBestAction = 'upseller';

    // ---------- TENDANCE : CA 2nd semestre vs 1er semestre de l'historique ----------
    let trend = 'stable';
    if (vol && vol.dates.length >= 2) {
      const ds = vol.dates.slice().sort((a, b) => a.ts - b.ts);
      const mid = ds[0].ts + (ds[ds.length - 1].ts - ds[0].ts) / 2;
      let early = 0, late = 0;
      for (const d of ds) { if (d.ts < mid) early += d.amt; else late += d.amt; }
      if (late > early * 1.15) trend = 'hausse';
      else if (late < early * 0.85) trend = 'baisse';
    }

    out.push({
      client: c.label, clientKey: ck,
      health: clamp(health), trend, topSignal, nextBestAction,
      subscores: sub, details: detail,
      segment: c.attributes?.segmentLabel || c.attributes?.segment || null,
    });
  }

  // tri : les plus à risque (santé basse) en tête → priorité d'action
  out.sort((a, b) => a.health - b.health);

  // ---------- DISTRIBUTION : sain (>=70) / surveiller (40..69) / risque (<40) ----------
  const distribution = { sain: 0, surveiller: 0, risque: 0 };
  for (const c of out) { if (c.health >= 70) distribution.sain++; else if (c.health >= 40) distribution.surveiller++; else distribution.risque++; }

  return { clients: out, distribution, signalsUsed, weights: WEIGHTS };
}

module.exports = { customerHealth };
