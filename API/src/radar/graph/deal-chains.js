// Reconstitution de la CHAÎNE D'AFFAIRE : devis → commande → facture.
//
// Beaucoup d'ERP créent ces pièces SANS lien explicite (champs origin_id/linked
// vides). Mais ce sont les pièces d'un même deal : même CLIENT, mêmes ARTICLES,
// dans l'ordre chronologique. On infère donc des relations `derived_from` entre
// elles pour relier directement les éléments principaux (et pas seulement via
// leurs articles communs).
//
// Prudent : on ne relie que si recouvrement d'articles suffisant (Jaccard) OU
// montant identique, pour ne pas confondre deux deals du même client.

const PRIORITY = { quote: 0, order: 1, invoice: 2, supplier_invoice: 2 };  // ordre logique du flux

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
const numAmt = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };

/**
 * Infère les relations devis→commande→facture par client.
 * @returns {Promise<{ linked, scanned, byClient }>}
 */
async function inferDealChains(workspaceId, { minJaccard = 0.34, apply = true, log = () => {} } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');

  const txs = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: { $in: Object.keys(PRIORITY) } })
    .select('canonicalKey aliasKeys subtype label attributes firstSeenAt').lean();
  if (txs.length < 2) return { linked: 0, scanned: txs.length, byClient: 0 };

  // toute-clé → canon (pour résoudre les relations qui pointent vers un alias)
  const keyToCanon = new Map();
  for (const t of txs) { keyToCanon.set(t.canonicalKey, t.canonicalKey); for (const a of t.aliasKeys || []) keyToCanon.set(a, t.canonicalKey); }
  const txByCanon = new Map(txs.map(t => [t.canonicalKey, t]));

  // relations : client (party_of/billed_to) + articles (line_item)
  const rels = await RadarRelation.find({ workspaceId, fromKey: { $in: [...keyToCanon.keys()] } })
    .select('fromKey toKey type role').lean();
  const clientOf = new Map();          // txCanon → clientKey
  const articlesOf = new Map();        // txCanon → Set(produits)
  for (const r of rels) {
    const canon = keyToCanon.get(r.fromKey); if (!canon) continue;
    if (r.type === 'party_of') { if (!clientOf.has(canon)) clientOf.set(canon, r.toKey); }
    else if (r.type === 'references' && r.role === 'line_item') {
      const set = articlesOf.get(canon) || new Set(); set.add(r.toKey); articlesOf.set(canon, set);
    }
  }

  // regroupe par client
  const byClient = new Map();
  for (const t of txs) { const c = clientOf.get(t.canonicalKey); if (!c) continue; (byClient.get(c) || byClient.set(c, []).get(c)).push(t); }

  let linked = 0;
  for (const [, group] of byClient) {
    if (group.length < 2) continue;
    // pour chaque pièce, on cherche la pièce SOURCE (priorité inférieure) la plus proche
    const sorted = group.slice().sort((a, b) => (PRIORITY[a.subtype] - PRIORITY[b.subtype]) || (new Date(a.firstSeenAt) - new Date(b.firstSeenAt)));
    for (const cur of sorted) {
      const candidates = sorted.filter(s => PRIORITY[s.subtype] < PRIORITY[cur.subtype]);
      if (!candidates.length) continue;
      let best = null, bestScore = 0;
      const curArts = articlesOf.get(cur.canonicalKey) || new Set();
      const curAmt = numAmt(cur.attributes?.amount_total);
      for (const cand of candidates) {
        const j = jaccard(curArts, articlesOf.get(cand.canonicalKey) || new Set());
        const candAmt = numAmt(cand.attributes?.amount_total);
        const amtMatch = curAmt != null && candAmt != null && Math.abs(curAmt - candAmt) < 0.01 ? 0.4 : 0;
        const score = Math.max(j, amtMatch);
        if (score > bestScore) { bestScore = score; best = cand; }
      }
      if (best && bestScore >= minJaccard) {
        if (apply) {
          await RadarRelation.updateOne(
            { workspaceId, fromKey: cur.canonicalKey, toKey: best.canonicalKey, type: 'derived_from', role: null },
            { $set: { confidence: Math.round(bestScore * 100) / 100, source: 'inference', evidence: { reason: 'deal_chain', score: bestScore } } },
            { upsert: true }
          ).catch(() => {});
        }
        linked++;
      }
    }
  }
  log(`[deal-chains] ${linked} liens devis→commande→facture inférés (${byClient.size} clients)`);
  return { linked, scanned: txs.length, byClient: byClient.size };
}

module.exports = { inferDealChains, jaccard };
