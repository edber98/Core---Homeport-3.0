// Radar — AUDIT TEMPS RÉEL des divergences (I13). Agrège en UNE liste priorisée
// TOUTES les anomalies/divergences détectables, en RÉUTILISANT les analyseurs
// existants (marge, sentiment, process gaps) + un contrôle propre : écart de
// montant entre une commande et son devis source (relation derived_from). Chaque
// analyseur est appelé en try/catch — l'absence ou l'échec de l'un n'empêche pas
// les autres. Sortie déterministe, triée par sévérité puis valeur. Zéro infra.

const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };

/**
 * Écarts devis↔commande : pour chaque commande reliée à un devis (relation
 * derived_from : fromKey=commande, toKey=devis), compare le montant total et
 * signale un écart > 5%.
 * @returns [{ orderLabel, quoteLabel, orderAmount, quoteAmount, deltaPct, delta }]
 */
async function findQuoteOrderGaps(workspaceId, { thresholdPct = 5 } = {}) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const RadarRelation = require('../db/models/radar-relation.model');

  // pièces : on a besoin des commandes ET des devis (la source)
  const txs = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: { $in: ['order', 'quote'] } })
    .select('canonicalKey aliasKeys label subtype attributes').lean();
  if (!txs.length) return [];

  // index toute-clé (canonique + alias) → entité, pour résoudre les relations
  const byKey = new Map();
  for (const t of txs) { byKey.set(t.canonicalKey, t); for (const a of t.aliasKeys || []) byKey.set(a, t); }
  const amountOf = (t) => num(t.attributes?.amount_total) || num(t.attributes?.total_ttc);

  // relations commande → devis (derived_from). fromKey = commande, toKey = devis.
  const rels = await RadarRelation.find({ workspaceId, type: 'derived_from' }).select('fromKey toKey').lean();
  const out = [];
  const seen = new Set();
  for (const r of rels) {
    const order = byKey.get(r.fromKey), quote = byKey.get(r.toKey);
    if (!order || !quote) continue;
    if (order.subtype !== 'order' || quote.subtype !== 'quote') continue;
    const pairId = `${order.canonicalKey}|${quote.canonicalKey}`;
    if (seen.has(pairId)) continue; seen.add(pairId);
    const oa = amountOf(order), qa = amountOf(quote);
    if (qa <= 0) continue;
    const delta = Math.round((oa - qa) * 100) / 100;
    const deltaPct = Math.round((delta / qa) * 1000) / 10;
    if (Math.abs(deltaPct) <= thresholdPct) continue;
    out.push({ orderLabel: order.label, quoteLabel: quote.label, orderAmount: Math.round(oa), quoteAmount: Math.round(qa), delta, deltaPct });
  }
  return out.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
}

/**
 * Audit temps réel : agrège toutes les divergences en une liste priorisée.
 * @returns {{ divergences: [{type, severity, label, detail, value}], counts: {haute, total}, score }}
 */
async function auditDivergences(workspaceId, opts = {}) {
  const divergences = [];

  // 1) MARGES faibles / négatives (réutilise l'analyseur de marge)
  try {
    const { analyzeMargins } = require('./margin');
    const m = await analyzeMargins(workspaceId, opts.margin || {});
    for (const d of m.lowMargin || []) {
      const negative = d.margin < 0;
      divergences.push({
        type: 'marge',
        severity: negative || d.rate < 5 ? 'haute' : 'normale',
        label: `Marge ${negative ? 'négative' : 'faible'} : ${d.label}`,
        detail: `${d.label} — marge ${d.margin}€ (${d.rate}%) pour un CA de ${d.revenue}€.`,
        value: Math.abs(d.margin),
      });
    }
  } catch (e) { /* analyseur marge absent/échoué → on continue */ }

  // 2) CLIENTS mécontents (réutilise l'analyseur de sentiment)
  try {
    const { analyzeSentiment } = require('./sentiment');
    const s = await analyzeSentiment(workspaceId, opts.sentiment || {});
    for (const c of s.byClient || []) {
      if (!c.atRisk && c.negatives < 1) continue;
      if (c.negatives < 1) continue;
      divergences.push({
        type: 'client',
        severity: c.atRisk ? 'haute' : 'normale',
        label: `Client mécontent : ${c.client}`,
        detail: `${c.client} — ${c.negatives} communication(s) négative(s) sur ${c.total}` + (c.lastComplaint ? ` (dernière : « ${c.lastComplaint} »).` : '.'),
        value: c.negatives,
      });
    }
  } catch (e) { /* analyseur sentiment absent/échoué → on continue */ }

  // 3) RUPTURES de flux (pièce sans amont attendu : champ processGaps de analytics)
  try {
    const { analyzeWorkspace } = require('./analytics');
    const a = await analyzeWorkspace(workspaceId);
    for (const g of a.processGaps || []) {
      divergences.push({
        type: 'rupture_flux',
        severity: g.severity === 'high' ? 'haute' : 'normale',
        label: `Rupture de flux : ${g.label}`,
        detail: g.reason,
        value: g.severity === 'high' ? 80 : 50,
      });
    }
  } catch (e) { /* analytics absent/échoué → on continue */ }

  // 4) ÉCARTS devis↔commande (contrôle propre, montant total > 5%)
  try {
    const gaps = await findQuoteOrderGaps(workspaceId, opts.quoteOrder || {});
    for (const g of gaps) {
      divergences.push({
        type: 'ecart_devis_commande',
        severity: Math.abs(g.deltaPct) >= 15 ? 'haute' : 'normale',
        label: `Écart devis↔commande : ${g.orderLabel}`,
        detail: `Commande « ${g.orderLabel} » (${g.orderAmount}€) vs devis « ${g.quoteLabel} » (${g.quoteAmount}€) — écart de ${g.deltaPct}% (${g.delta >= 0 ? '+' : ''}${g.delta}€).`,
        value: Math.abs(g.delta),
      });
    }
  } catch (e) { /* contrôle écart absent/échoué → on continue */ }

  // tri : sévérité (haute d'abord) puis valeur décroissante
  const sevRank = (s) => (s === 'haute' ? 1 : 0);
  divergences.sort((a, b) => (sevRank(b.severity) - sevRank(a.severity)) || (b.value - a.value));

  const haute = divergences.filter(d => d.severity === 'haute').length;
  const total = divergences.length;
  // score de santé 0..100 : 100 = aucune divergence, pénalise fort les hautes.
  // Décroissance EXPONENTIELLE (pas linéaire écrêtée) : l'ancienne formule saturait à 0
  // dès ~8 divergences hautes → « score 0 » indiscriminé. Ici 15 hautes ≈ 10, 30 hautes ≈ 1 :
  // le score reste comparable d'un jour à l'autre même en situation dégradée.
  const score = Math.round(100 * Math.exp(-(haute * 0.12 + (total - haute) * 0.04)));

  return { divergences, counts: { haute, total }, score };
}

module.exports = { auditDivergences, findQuoteOrderGaps };
