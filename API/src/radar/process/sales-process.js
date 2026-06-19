// Processus de VENTE GLOBAL (bout-en-bout) — I4 + segmentation I3.
//
// Au-delà du cycle par type, on reconstitue le PROCESSUS MÉTIER complet :
// devis (créé→validé→signé/refusé) → commande (→validée→livrée) → facture
// (→émise→payée), par client/affaire, avec les DURÉES entre étapes (= goulots) et
// un regroupement par SEGMENT (secteur du client) pour comparer les flux.
//
// S'appuie sur les deltas de cycle de vie (réels, reconstitués depuis les
// timestamps). Déterministe, sans LLM.

const { stateFieldOf, canonState } = require('./miner');

const TYPE_FR = { quote: 'Devis', order: 'Commande', invoice: 'Facture', supplier_invoice: 'Facture fourn.' };
const ORDER = { quote: 0, order: 1, invoice: 2 };
const DAY = 86400000;

function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }

/**
 * @returns {Promise<{deals, stages, transitions, variants, bySegment, bottlenecks}>}
 */
async function mineSalesProcess(workspaceId, { segment = null } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');
  const RadarDelta = require('../../db/models/radar-delta.model');
  const RadarMapping = require('../../db/models/radar-mapping.model');
  const RadarConnector = require('../../db/models/radar-connector.model');

  // 1. transactions de vente + leur client + segment
  const txs = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: { $in: Object.keys(ORDER) } })
    .select('canonicalKey aliasKeys subtype label attributes sources firstSeenAt').lean();
  if (!txs.length) return empty();
  const parties = await RadarEntity.find({ workspaceId, coreType: 'Party' }).select('canonicalKey aliasKeys attributes label').lean();
  const segOf = new Map();
  for (const p of parties) { const s = p.attributes?.segment || null; segOf.set(p.canonicalKey, s); for (const a of p.aliasKeys || []) segOf.set(a, s); }

  const keyToCanon = new Map();
  for (const t of txs) { keyToCanon.set(t.canonicalKey, t.canonicalKey); for (const a of t.aliasKeys || []) keyToCanon.set(a, t.canonicalKey); }
  const partyKeys = new Set(parties.flatMap(p => [p.canonicalKey, ...(p.aliasKeys || [])]));
  const rels = await RadarRelation.find({ workspaceId, type: 'party_of' }).select('fromKey toKey').lean();
  const clientOf = new Map();
  for (const r of rels) { const f = keyToCanon.get(r.fromKey); if (f && partyKeys.has(r.toKey)) clientOf.set(f, r.toKey); }

  // 2. timelines d'état par pièce (depuis les deltas), via les mappings à champ d'état
  const mappings = await RadarMapping.find({ status: 'active', $or: [{ workspaceId }, { workspaceId: null }] }).lean();
  const mapByRaw = new Map();
  for (const m of mappings) { if (stateFieldOf(m)) { const cur = mapByRaw.get(m.rawEntityType); if (!cur || (m.workspaceId && !cur.workspaceId)) mapByRaw.set(m.rawEntityType, m); } }
  const provByConn = new Map((await RadarConnector.find({ workspaceId }).select('providerKey').lean()).map(c => [String(c._id), c.providerKey]));
  const deltas = await RadarDelta.find({ workspaceId }).select('entityType entityKey type after occurredAt connectorId').lean();
  // timeline par (rawType:rawId)
  const tl = new Map();
  for (const d of deltas) {
    const m = mapByRaw.get(d.entityType); if (!m) continue;
    const sf = stateFieldOf(m); if (!sf) continue;
    const st = canonState(d.after ? d.after[sf.rawField] : undefined, sf.valueMap); if (!st) continue;
    const k = `${d.entityType}:${d.entityKey}`; const arr = tl.get(k) || []; arr.push({ st, at: new Date(d.occurredAt).getTime() }); tl.set(k, arr);
  }

  // timeline d'une entité : la clé "provider:type:id" peut être la canonicalKey
  // (factures : pas d'identité forte) OU un aliasKey. On teste les deux.
  const timelineOf = (e) => {
    for (const a of [e.canonicalKey, ...(e.aliasKeys || [])]) { const p = String(a).split(':'); if (p.length === 3 && tl.has(`${p[1]}:${p[2]}`)) return tl.get(`${p[1]}:${p[2]}`); }
    return [];
  };

  // 3. événements par CLIENT (= affaire) : UNIQUEMENT les états réels (deltas datés),
  // pour garder une chronologie cohérente (pas de mélange date document / date delta).
  const evByClient = new Map();   // clientKey -> [{stage, at, sub}]
  for (const t of txs) {
    const c = clientOf.get(t.canonicalKey); if (!c) continue;
    const fr = TYPE_FR[t.subtype] || t.subtype;
    const states = timelineOf(t).slice().sort((a, b) => a.at - b.at);
    const arr = evByClient.get(c) || [];
    if (states.length) for (const s of states) arr.push({ stage: `${fr} ${s.st}`, at: s.at, sub: t.subtype });
    else arr.push({ stage: `${fr} créé`, at: new Date(t.firstSeenAt).getTime(), sub: t.subtype });  // pas de cycle → au moins la création
    evByClient.set(c, arr);
  }

  // 4. agrégation DFG + variantes + durées, global et par segment
  const agg = (clientKeys) => {
    const stageFreq = new Map(), trans = new Map(), variants = new Map(); let deals = 0;
    for (const c of clientKeys) {
      const evs = (evByClient.get(c) || []).slice().sort((a, b) => a.at - b.at || (ORDER[a.sub] - ORDER[b.sub]));
      if (!evs.length) continue; deals++;
      const seen = new Set(), seq = [];
      for (const e of evs) { if (!seen.has(e.stage)) { seen.add(e.stage); seq.push(e); } }
      for (const e of seq) stageFreq.set(e.stage, (stageFreq.get(e.stage) || 0) + 1);
      for (let i = 0; i < seq.length - 1; i++) {
        const k = `${seq[i].stage}→${seq[i + 1].stage}`;
        const tr = trans.get(k) || { from: seq[i].stage, to: seq[i + 1].stage, count: 0, durs: [] };
        tr.count++; const d = seq[i + 1].at - seq[i].at; if (d >= 0) tr.durs.push(d); trans.set(k, tr);
      }
      const v = seq.map(s => s.stage).join(' → '); variants.set(v, (variants.get(v) || 0) + 1);
    }
    const transitions = [...trans.values()].map(t => ({ from: t.from, to: t.to, count: t.count, avgDurationMs: Math.round(mean(t.durs)) })).sort((a, b) => b.count - a.count);
    return {
      deals,
      stages: [...stageFreq.entries()].map(([stage, count]) => ({ stage, count })).sort((a, b) => b.count - a.count),
      transitions,
      variants: [...variants.entries()].map(([sequence, count]) => ({ sequence, count })).sort((a, b) => b.count - a.count).slice(0, 12),
      bottlenecks: transitions.filter(t => t.avgDurationMs >= 3 * DAY).sort((a, b) => b.avgDurationMs - a.avgDurationMs).slice(0, 6),
    };
  };

  // filtre segment éventuel
  const clients = [...evByClient.keys()].filter(c => !segment || segOf.get(c) === segment);
  const global = agg(clients);

  // breakdown par segment (comparer les flux/goulots)
  const segs = new Map();
  for (const c of clients) { const s = segOf.get(c) || 'non typé'; const arr = segs.get(s) || []; arr.push(c); segs.set(s, arr); }
  const bySegment = [...segs.entries()].map(([seg, ck]) => ({ segment: seg, ...agg(ck) })).sort((a, b) => b.deals - a.deals);

  return { ...global, bySegment };

  function empty() { return { deals: 0, stages: [], transitions: [], variants: [], bottlenecks: [], bySegment: [] }; }
}

module.exports = { mineSalesProcess };
