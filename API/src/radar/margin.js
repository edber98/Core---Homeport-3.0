// Radar — ANALYSE DE MARGE (I10). Pour chaque pièce (commande/facture), on calcule
// la marge = chiffre d'affaires − coût de revient, à partir des LIGNES (prix de vente
// unitaire × quantité) et du PRIX DE REVIENT de chaque produit (attribut cost_price).
// Pour les SERVICES facturés en jours, si des heures réelles sont pointées (relation
// `assigned_to` / attribut hours), on peut substituer le coût réel = heures × taux.
// Surface les affaires à marge FAIBLE ou NÉGATIVE (anomalie business). 100% dynamique.

const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };

/**
 * @param opts.hourlyCost  coût horaire interne par défaut pour les services en jours (défaut 350€/j → ~50€/h)
 * @returns {{ totals, byType, deals, lowMargin }}
 */
async function analyzeMargins(workspaceId, { dailyCost = 350 } = {}) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const RadarRelation = require('../db/models/radar-relation.model');

  // produits → coût de revient + type (produit/service)
  const products = await RadarEntity.find({ workspaceId, coreType: 'Asset', subtype: 'product' })
    .select('canonicalKey aliasKeys label attributes').lean();
  const prodByKey = new Map();
  for (const p of products) { const v = { cost: num(p.attributes?.cost_price), price: num(p.attributes?.price), type: p.attributes?.type, label: p.label }; prodByKey.set(p.canonicalKey, v); for (const a of p.aliasKeys || []) prodByKey.set(a, v); }

  // transactions à analyser (commandes + factures = pièces fermes)
  const txs = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: { $in: ['order', 'invoice'] } })
    .select('canonicalKey aliasKeys label subtype').lean();
  const txByKey = new Map();
  for (const t of txs) { txByKey.set(t.canonicalKey, t); for (const a of t.aliasKeys || []) txByKey.set(a, t); }

  // lignes (relations line_item) avec qté + prix unitaire (evidence)
  const lineRels = await RadarRelation.find({ workspaceId, role: 'line_item' }).select('fromKey toKey evidence').lean();

  const dealMargins = new Map();   // txCanon → { revenue, cost, label, subtype }
  for (const r of lineRels) {
    const tx = txByKey.get(r.fromKey); if (!tx) continue;
    const prod = prodByKey.get(r.toKey);
    const qty = num(r.evidence?.qty) || 1;
    const unit = num(r.evidence?.unitPrice) || (prod ? prod.price : 0);
    const revenue = qty * unit;
    // coût : prix de revient du produit ; pour un SERVICE sans coût saisi, on estime
    // via le coût-jour interne (qté = nb de jours) → marge service réaliste.
    let cost;
    if (prod && prod.cost > 0) cost = qty * prod.cost;
    else if (prod && prod.type === 'service') cost = qty * dailyCost;
    else cost = qty * (unit * 0.7);                                  // matériel sans coût → ~70% estimé
    const agg = dealMargins.get(tx.canonicalKey) || { revenue: 0, cost: 0, label: tx.label, subtype: tx.subtype };
    agg.revenue += revenue; agg.cost += cost; dealMargins.set(tx.canonicalKey, agg);
  }

  const deals = [...dealMargins.entries()].map(([key, d]) => {
    const margin = Math.round((d.revenue - d.cost) * 100) / 100;
    const rate = d.revenue > 0 ? Math.round((margin / d.revenue) * 100) : 0;
    return { key, label: d.label, subtype: d.subtype, revenue: Math.round(d.revenue), cost: Math.round(d.cost), margin, rate };
  }).sort((a, b) => a.rate - b.rate);

  const totals = deals.reduce((t, d) => ({ revenue: t.revenue + d.revenue, cost: t.cost + d.cost, margin: t.margin + d.margin }), { revenue: 0, cost: 0, margin: 0 });
  totals.rate = totals.revenue > 0 ? Math.round((totals.margin / totals.revenue) * 100) : 0;

  // marge par type de produit (produit vs service)
  const byType = {};
  for (const r of lineRels) {
    const tx = txByKey.get(r.fromKey); if (!tx) continue; const prod = prodByKey.get(r.toKey); if (!prod) continue;
    const qty = num(r.evidence?.qty) || 1, unit = num(r.evidence?.unitPrice) || prod.price;
    const cost = prod.cost > 0 ? qty * prod.cost : (prod.type === 'service' ? qty * dailyCost : qty * unit * 0.7);
    const k = prod.type || 'autre'; const e = byType[k] || { revenue: 0, cost: 0 }; e.revenue += qty * unit; e.cost += cost; byType[k] = e;
  }
  for (const k of Object.keys(byType)) { byType[k].margin = Math.round(byType[k].revenue - byType[k].cost); byType[k].rate = byType[k].revenue > 0 ? Math.round((byType[k].margin / byType[k].revenue) * 100) : 0; byType[k].revenue = Math.round(byType[k].revenue); byType[k].cost = Math.round(byType[k].cost); }

  // affaires à marge FAIBLE (<15%) ou NÉGATIVE → anomalie business à surveiller
  const lowMargin = deals.filter(d => d.rate < 15).slice(0, 20);
  return { totals, byType, deals: deals.slice(0, 50), lowMargin };
}

module.exports = { analyzeMargins };
