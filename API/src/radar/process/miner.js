// Radar — process mining (style Celonis), 100% déterministe, sans LLM.
//
// L'« event log » existe déjà : la suite des RadarDelta d'une entité est son
// cycle de vie (ex. facture : draft → posted → paid). On agrège ces transitions
// par type d'entité en un directly-follows graph (DFG) + variantes + durées
// (goulots). C'est exactement ce que fait Celonis, sur nos données d'ontologie.

// Champs canoniques porteurs d'état (cycle de vie), par ordre de priorité.
const STATE_FIELDS = ['state', 'status', 'payment_state'];

const DELETED = '∅ supprimé';

/** Détermine le champ d'état d'un mapping : { canonField, rawField, valueMap }. Pure. */
function stateFieldOf(mapping) {
  const fm = mapping && mapping.fieldMap || {};
  for (const canon of STATE_FIELDS) {
    if (fm[canon]) return { canonField: canon, rawField: fm[canon], valueMap: (mapping.valueMap || {})[canon] || null };
  }
  return null;
}

/** Applique le valueMap pour un libellé d'état propre. Pure. */
function canonState(value, valueMap) {
  if (value == null) return null;
  const v = String(value);
  if (valueMap && Object.prototype.hasOwnProperty.call(valueMap, v)) return valueMap[v];
  return v;
}

/** Reconstruit les timelines d'états par entité depuis ses deltas. Pure.
 *  @returns {Map<entityKey, Array<{state, at}>>} séquences collapsées (sans doublon consécutif). */
function buildTimelines(deltas, mapping) {
  const sf = stateFieldOf(mapping);
  if (!sf) return new Map();
  const byEntity = new Map();
  for (const d of deltas) {
    const arr = byEntity.get(d.entityKey) || [];
    arr.push(d); byEntity.set(d.entityKey, arr);
  }
  const timelines = new Map();
  for (const [key, ds] of byEntity) {
    ds.sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));
    const seq = [];
    for (const d of ds) {
      let state;
      if (d.type === 'deleted') state = DELETED;
      else {
        const raw = d.after ? d.after[sf.rawField] : undefined;
        if (raw === undefined || raw === null || raw === '') continue;
        state = canonState(raw, sf.valueMap);
      }
      if (seq.length && seq[seq.length - 1].state === state) continue; // collapse
      seq.push({ state, at: d.occurredAt });
    }
    if (seq.length) timelines.set(key, seq);
  }
  return timelines;
}

function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

/** Mine un DFG + variantes + durées depuis des timelines. Pure. */
function mineGroup(timelines) {
  const stateFreq = new Map();
  const transitions = new Map();      // "from→to" → { from, to, count, durations[] }
  const variants = new Map();         // "a → b → c" → count
  let withTransitions = 0;
  for (const seq of timelines.values()) {
    for (const s of seq) stateFreq.set(s.state, (stateFreq.get(s.state) || 0) + 1);
    if (seq.length > 1) withTransitions++;
    for (let i = 0; i < seq.length - 1; i++) {
      const k = `${seq[i].state}→${seq[i + 1].state}`;
      const t = transitions.get(k) || { from: seq[i].state, to: seq[i + 1].state, count: 0, durations: [] };
      t.count++;
      const dur = new Date(seq[i + 1].at) - new Date(seq[i].at);
      if (dur >= 0) t.durations.push(dur);
      transitions.set(k, t);
    }
    const variant = seq.map(s => s.state).join(' → ');
    variants.set(variant, (variants.get(variant) || 0) + 1);
  }
  return {
    entityCount: timelines.size,
    entitiesWithTransitions: withTransitions,
    states: [...stateFreq.entries()].map(([state, count]) => ({ state, count })).sort((a, b) => b.count - a.count),
    transitions: [...transitions.values()]
      .map(t => ({ from: t.from, to: t.to, count: t.count, avgDurationMs: Math.round(mean(t.durations)) }))
      .sort((a, b) => b.count - a.count),
    variants: [...variants.entries()].map(([sequence, count]) => ({ sequence, count }))
      .sort((a, b) => b.count - a.count).slice(0, 12),
  };
}

/**
 * Mine les processus d'un workspace, groupés par coreType.subtype.
 * @returns {Promise<Array<{coreType, subtype, ...mineGroup}>>}
 */
async function mineProcesses(workspaceId, { coreType, subtype } = {}) {
  const RadarDelta = require('../../db/models/radar-delta.model');
  const RadarMapping = require('../../db/models/radar-mapping.model');

  const mappings = await RadarMapping.find({ status: 'active', $or: [{ workspaceId }, { workspaceId: null }] }).lean();
  // mapping par rawEntityType (workspace prioritaire), ne garder que ceux à champ d'état
  const byRawType = new Map();
  for (const m of mappings) {
    if (!stateFieldOf(m)) continue;
    const cur = byRawType.get(m.rawEntityType);
    if (!cur || (m.workspaceId && !cur.workspaceId)) byRawType.set(m.rawEntityType, m);
  }
  if (!byRawType.size) return [];

  // filtre éventuel par coreType/subtype demandé
  const rawTypes = [...byRawType.values()]
    .filter(m => (!coreType || m.target.coreType === coreType) && (!subtype || m.target.subtype === subtype))
    .map(m => m.rawEntityType);
  if (!rawTypes.length) return [];

  const deltas = await RadarDelta.find({ workspaceId, entityType: { $in: rawTypes } })
    .select('entityType entityKey type before after occurredAt').lean();

  // grouper les deltas par rawEntityType
  const deltasByType = new Map();
  for (const d of deltas) {
    const arr = deltasByType.get(d.entityType) || [];
    arr.push(d); deltasByType.set(d.entityType, arr);
  }

  // grouper les résultats par coreType.subtype (plusieurs rawTypes peuvent converger)
  const groups = new Map();
  for (const [rawType, ds] of deltasByType) {
    const mapping = byRawType.get(rawType);
    const timelines = buildTimelines(ds, mapping);
    if (!timelines.size) continue;
    const gk = `${mapping.target.coreType}.${mapping.target.subtype || ''}`;
    const existing = groups.get(gk);
    if (existing) for (const [k, v] of timelines) existing.timelines.set(`${rawType}:${k}`, v);
    else groups.set(gk, { coreType: mapping.target.coreType, subtype: mapping.target.subtype, timelines: new Map([...timelines].map(([k, v]) => [`${rawType}:${k}`, v])) });
  }

  return [...groups.values()].map(g => ({ coreType: g.coreType, subtype: g.subtype, ...mineGroup(g.timelines) }))
    .filter(g => g.transitions.length > 0 || g.states.length > 0)
    .sort((a, b) => b.entityCount - a.entityCount);
}

module.exports = { mineProcesses, buildTimelines, mineGroup, stateFieldOf, canonState };
