// Radar — ENTRAÎNEMENT + VÉRIFICATION d'un VRAI modèle de conversion devis→commande.
//
// Là où winrate.js fait un scoring statistique transparent (taux de base + multiplicateurs
// de cote), CE module ENTRAÎNE une régression logistique par descente de gradient sur les
// devis RÉSOLUS (gagné=1 / perdu=0), puis la VÉRIFIE sur un jeu de test séparé.
//
// MÉTHODE :
//  1) Dataset depuis les devis résolus, features numériques :
//       [ montant, ancienneté (jours), sentiment client moyen, nb emails/relances liés,
//         segment encodé (ordinal stable) ].
//     La standardisation (z-score) est faite par le logreg (learning/logreg.js).
//  2) Split train/test stratifié (testRatio), seed déterministe.
//  3) Régression logistique (descente de gradient, perte log, L2) via learning/logreg.js
//     (sigmoïde, ~800 epochs lr 0.3 — réutilise l'utilitaire de payment-risk.js).
//  4) Évaluation TEST : accuracy, AUC (rang de Mann-Whitney), matrice de confusion,
//     baseline = prédire toujours la classe majoritaire du train.
//
// Démarrage à froid : si < 12 exemples résolus, on génère des exemples SYNTHÉTIQUES
// cohérents (la proba de win décroît avec montant/âge, croît avec sentiment/relances)
// pour démontrer le pipeline de bout en bout, et on le SIGNALE (synthetic:true + note).
//
// N'écrit RIEN en base : pur entraînement+vérification, renvoie les métriques.

const { fit, predict } = require('../learning/logreg');

const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const DAY = 86400; // dates en unix secondes

const WON = new Set(['signé', 'signe', 'accepté', 'accepte', 'gagné', 'gagne']);
const LOST = new Set(['refusé', 'refuse', 'perdu', 'annulé', 'annule']);

const amountOf = (e) => num(e.attributes?.amount_total) || num(e.attributes?.total_ttc);
const dateOf = (e) => num(e.attributes?.date) || (e.firstSeenAt ? Math.round(new Date(e.firstSeenAt).getTime() / 1000) : 0);

const FEATURES = ['amount', 'age_days', 'sentiment', 'n_emails', 'segment_code'];

// ── DATASET depuis les devis résolus ────────────────────────────────────────
async function buildDataset(workspaceId) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');
  const now = Math.round(Date.now() / 1000);

  const quotes = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'quote' })
    .select('canonicalKey aliasKeys label attributes firstSeenAt').lean();

  // index clés devis (canonique + alias)
  const quoteKeys = new Set();
  for (const q of quotes) { quoteKeys.add(q.canonicalKey); for (const a of q.aliasKeys || []) quoteKeys.add(a); }

  // clients + segment (résolution alias → canonique via aliasKeys, comme predict/winrate)
  const clients = await RadarEntity.find({ workspaceId, coreType: 'Party', roles: 'client' })
    .select('canonicalKey aliasKeys label attributes').lean();
  const clientInfo = new Map();
  for (const c of clients) {
    const info = { canon: c.canonicalKey, segment: c.attributes?.segment || 'inconnu' };
    clientInfo.set(c.canonicalKey, info);
    for (const a of c.aliasKeys || []) clientInfo.set(a, info);
  }
  const partyRels = await RadarRelation.find({ workspaceId, type: 'party_of', role: 'client' }).select('fromKey toKey').lean();
  const clientOfQuote = new Map();
  for (const r of partyRels) { if (quoteKeys.has(r.fromKey)) { const ci = clientInfo.get(r.toKey); if (ci) clientOfQuote.set(r.fromKey, ci); } }

  // commande dérivée d'un devis → gagné même si state ouvert
  const derived = await RadarRelation.find({ workspaceId, type: 'derived_from' }).select('fromKey toKey').lean();
  const quoteHasOrder = new Set();
  for (const r of derived) { if (quoteKeys.has(r.toKey)) quoteHasOrder.add(r.toKey); }

  // sentiment + nb emails par client (emails liés via references/party_of)
  const emails = await RadarEntity.find({ workspaceId, coreType: 'Communication', subtype: 'email' })
    .select('canonicalKey attributes').lean();
  const SENT = { positif: 1, neutre: 0, négatif: -1, negatif: -1 };
  const emailRels = await RadarRelation.find({ workspaceId, type: { $in: ['references', 'party_of'] } }).select('fromKey toKey').lean();
  const clientCanonSet = new Set([...clientInfo.values()].map((c) => c.canon));
  const clientOfEmail = new Map();
  for (const r of emailRels) { if (clientCanonSet.has(r.toKey) && !clientOfEmail.has(r.fromKey)) clientOfEmail.set(r.fromKey, r.toKey); }
  const sentAgg = new Map();   // canon → { sum, n }
  for (const e of emails) {
    const ck = clientOfEmail.get(e.canonicalKey); if (!ck) continue;
    const s = SENT[e.attributes?.sentiment];
    const a = sentAgg.get(ck) || { sum: 0, n: 0 };
    if (s !== undefined) a.sum += s;
    a.n += 1; sentAgg.set(ck, a);
  }

  // encodage ordinal stable des segments (tri alpha → indices)
  const segs = [...new Set(clients.map((c) => c.attributes?.segment || 'inconnu'))].sort();
  const segCode = new Map(segs.map((s, i) => [s, i]));

  const X = [], y = [], rows = [];
  for (const q of quotes) {
    const st = String(q.attributes?.state || '').toLowerCase();
    const hasOrder = quoteHasOrder.has(q.canonicalKey) || (q.aliasKeys || []).some((a) => quoteHasOrder.has(a));
    let label;
    if (WON.has(st) || (hasOrder && !LOST.has(st))) label = 1;
    else if (LOST.has(st)) label = 0;
    else continue; // ouvert → pas de ground truth, exclu du dataset

    const ci = clientOfQuote.get(q.canonicalKey);
    const agg = ci ? sentAgg.get(ci.canon) : null;
    const sentiment = agg && agg.n ? agg.sum / agg.n : 0;
    const nEmails = agg ? agg.n : 0;
    const ageDays = dateOf(q) ? Math.max(0, (now - dateOf(q)) / DAY) : 0;
    const segment = ci ? ci.segment : 'inconnu';

    X.push([amountOf(q), ageDays, sentiment, nEmails, segCode.has(segment) ? segCode.get(segment) : 0]);
    y.push(label);
    rows.push({ label: q.label || q.canonicalKey, segment });
  }
  return { X, y, rows };
}

// ── Exemples SYNTHÉTIQUES cohérents (cold start) ────────────────────────────
// Générateur déterministe : la proba de win baisse avec montant/âge, monte avec
// sentiment/relances. Permet de prouver que le pipeline entraîne+évalue réellement.
function syntheticDataset(n = 120) {
  let seed = 1337;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const sig = (z) => 1 / (1 + Math.exp(-z));
  const X = [], y = [];
  for (let i = 0; i < n; i++) {
    const amount = Math.round(500 + rnd() * 20000);
    const ageDays = Math.round(rnd() * 90);
    const sentiment = Math.round((rnd() * 2 - 1) * 100) / 100;
    const nEmails = Math.round(rnd() * 8);
    const segCode = Math.floor(rnd() * 4);
    // log-odds « vraie » + bruit
    const z = 1.1
      - (amount / 20000) * 2.2      // gros devis → moins de win
      - (ageDays / 90) * 1.6        // devis qui traîne → moins de win
      + sentiment * 1.4             // sentiment positif → plus de win
      + (nEmails / 8) * 1.0         // relances → plus d'engagement
      + (segCode - 1.5) * 0.3
      + (rnd() - 0.5) * 0.8;
    X.push([amount, ageDays, sentiment, nEmails, segCode]);
    y.push(rnd() < sig(z) ? 1 : 0);
  }
  return { X, y, rows: X.map((_, i) => ({ label: `synth-${i}`, segment: 'synth' })) };
}

// ── Split stratifié déterministe ────────────────────────────────────────────
function stratifiedSplit(X, y, testRatio) {
  const idx = X.map((_, i) => i);
  // mélange déterministe (LCG sur l'indice) pour reproductibilité
  let seed = 42;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const byClass = { 0: [], 1: [] };
  for (const i of idx) byClass[y[i]].push(i);
  for (const k of [0, 1]) byClass[k].sort(() => rnd() - 0.5);
  const trainIdx = [], testIdx = [];
  for (const k of [0, 1]) {
    const arr = byClass[k];
    const nTest = Math.max(arr.length >= 2 ? 1 : 0, Math.round(arr.length * testRatio));
    arr.forEach((i, j) => (j < nTest ? testIdx : trainIdx).push(i));
  }
  const pick = (sel) => ({ X: sel.map((i) => X[i]), y: sel.map((i) => y[i]) });
  return { train: pick(trainIdx), test: pick(testIdx) };
}

// ── AUC (Mann-Whitney) ──────────────────────────────────────────────────────
function auc(scores, y) {
  const pos = [], neg = [];
  scores.forEach((s, i) => (y[i] === 1 ? pos : neg).push(s));
  if (!pos.length || !neg.length) return null;
  // rang moyen des positifs (gère les ex-aequo)
  const paired = scores.map((s, i) => ({ s, y: y[i] })).sort((a, b) => a.s - b.s);
  let rankSum = 0, k = 0;
  while (k < paired.length) {
    let j = k; while (j + 1 < paired.length && paired[j + 1].s === paired[k].s) j++;
    const avgRank = (k + j + 2) / 2; // rangs 1-based
    for (let t = k; t <= j; t++) if (paired[t].y === 1) rankSum += avgRank;
    k = j + 1;
  }
  return (rankSum - (pos.length * (pos.length + 1)) / 2) / (pos.length * neg.length);
}

/**
 * Entraîne et VÉRIFIE une régression logistique devis→commande.
 * @param {ObjectId|string} workspaceId
 * @param {{testRatio?:number}} opts
 * @returns {Promise<{trained, synthetic, note, weights, features, train:{n}, test:{n,accuracy,auc,baseline,confusion}, betterThanBaseline}>}
 */
async function trainWinRateModel(workspaceId, { testRatio = 0.3 } = {}) {
  let { X, y } = await buildDataset(workspaceId);
  const realN = X.length;
  let synthetic = false, note = `${realN} devis résolus réels`;

  if (X.length < 12) {
    ({ X, y } = syntheticDataset(120));
    synthetic = true;
    note = `Seulement ${realN} devis résolus réels (<12) — dataset SYNTHÉTIQUE cohérent (n=${X.length}) généré pour démontrer le pipeline d'entraînement+vérification.`;
  }

  const { train, test } = stratifiedSplit(X, y, testRatio);
  if (!test.X.length || new Set(train.y).size < 2) {
    return { trained: false, synthetic, note: note + ' — split impossible (une seule classe ou test vide).', features: FEATURES };
  }

  const model = fit(train.X, train.y, { lr: 0.3, epochs: 800, l2: 0.001 });

  // baseline = classe majoritaire du TRAIN
  const trainPos = train.y.filter((v) => v === 1).length;
  const majority = trainPos >= train.y.length - trainPos ? 1 : 0;

  // éval test
  const scores = test.X.map((x) => predict(model, x));
  let ok = 0; const cm = { tp: 0, tn: 0, fp: 0, fn: 0 };
  scores.forEach((p, i) => {
    const pred = p >= 0.5 ? 1 : 0, t = test.y[i];
    if (pred === t) ok++;
    if (pred === 1 && t === 1) cm.tp++; else if (pred === 0 && t === 0) cm.tn++;
    else if (pred === 1 && t === 0) cm.fp++; else cm.fn++;
  });
  const accuracy = Math.round((ok / test.y.length) * 1000) / 1000;
  const baseAcc = Math.round((test.y.filter((v) => v === majority).length / test.y.length) * 1000) / 1000;
  const aucVal = auc(scores, test.y);

  return {
    trained: true,
    synthetic,
    note,
    weights: { w: model.w.map((v) => Math.round(v * 1e4) / 1e4), b: Math.round(model.b * 1e4) / 1e4 },
    features: FEATURES,
    train: { n: train.X.length, positives: trainPos },
    test: {
      n: test.X.length,
      accuracy,
      auc: aucVal == null ? null : Math.round(aucVal * 1000) / 1000,
      baseline: baseAcc,
      confusion: cm,
    },
    betterThanBaseline: accuracy >= baseAcc,
  };
}

module.exports = { trainWinRateModel, buildDataset, FEATURES };
