// Détection d'ÉCARTS de process : un état qui RÉGRESSE (revient en arrière) dans un
// cycle de vie normalement en avant — ex. un devis « signé » qui repasse en « brouillon ».
//
// 100% dynamique : on APPREND l'ordre normal des états depuis les données (position
// moyenne de chaque état dans les séquences observées), puis on signale les entités
// dont la timeline viole cet ordre. Aucun flux codé en dur.

const { buildTimelines, stateFieldOf } = require('./miner');

/**
 * @returns {Promise<Array<{ entityKey, subtype, from, to, at, reason }>>}
 */
async function findStateRegressions(workspaceId) {
  const RadarDelta = require('../../db/models/radar-delta.model');
  const RadarMapping = require('../../db/models/radar-mapping.model');

  const mappings = await RadarMapping.find({ status: 'active', $or: [{ workspaceId }, { workspaceId: null }] }).lean();
  const byRaw = new Map();
  for (const m of mappings) { if (!stateFieldOf(m)) continue; const cur = byRaw.get(m.rawEntityType); if (!cur || (m.workspaceId && !cur.workspaceId)) byRaw.set(m.rawEntityType, m); }
  if (!byRaw.size) return [];

  const deltas = await RadarDelta.find({ workspaceId, entityType: { $in: [...byRaw.keys()] } })
    .select('entityType entityKey type before after occurredAt').lean();
  const byType = new Map();
  for (const d of deltas) { const a = byType.get(d.entityType) || []; a.push(d); byType.set(d.entityType, a); }

  const out = [];
  for (const [rawType, ds] of byType) {
    const mapping = byRaw.get(rawType);
    const timelines = buildTimelines(ds, mapping);   // Map<entityKey, [{state, at}]>
    if (timelines.size < 3) continue;

    // 1) APPREND l'ordre : position moyenne de chaque état dans les séquences
    const posSum = new Map(), posCnt = new Map();
    for (const seq of timelines.values()) {
      seq.forEach((s, i) => { posSum.set(s.state, (posSum.get(s.state) || 0) + i); posCnt.set(s.state, (posCnt.get(s.state) || 0) + 1); });
    }
    const rank = new Map();
    for (const st of posSum.keys()) rank.set(st, posSum.get(st) / posCnt.get(st));

    // 2) DÉTECTE : une transition vers un état de rang STRICTEMENT inférieur = régression
    for (const [key, seq] of timelines) {
      for (let i = 0; i < seq.length - 1; i++) {
        const a = seq[i].state, b = seq[i + 1].state;
        if (rank.has(a) && rank.has(b) && rank.get(b) + 0.5 < rank.get(a)) {   // marge anti-bruit
          out.push({
            entityKey: key, subtype: mapping.target.subtype, from: a, to: b, at: seq[i + 1].at,
            severity: 'medium',
            reason: `${mapping.target.subtype || rawType} « ${key} » a régressé de « ${a} » à « ${b} » (retour en arrière inhabituel)`,
          });
        }
      }
    }
  }
  return out;
}

module.exports = { findStateRegressions };
