// Moteur d'analyse HYPER-DYNAMIQUE — aucune dimension imposée.
//
// Le système ne lance PAS un jeu fixe d'analyses (stock, goulots…) pour tout le
// monde. Il INSPECTE d'abord ce que l'entreprise possède réellement (types
// d'entités, attributs présents) puis n'ACTIVE que les analyseurs dont la donnée
// existe : une société sans stock n'aura jamais d'analyse de stock ; une société de
// production aura l'analyse de production. Plus il y a de matière, plus il construit
// d'analyses spécifiques. Chaque analyseur déclare sa PRÉCONDITION (`applies`).

/** Inspecte le graphe : quels types/attributs existent (le « profil » de l'entreprise). */
async function profileWorkspace(workspaceId) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const RadarRelation = require('../db/models/radar-relation.model');
  const agg = await RadarEntity.aggregate([
    { $match: { workspaceId } },
    { $group: { _id: { c: '$coreType', s: '$subtype' }, n: { $sum: 1 } } },
  ]);
  const types = new Map();              // "coreType.subtype" → count
  for (const a of agg) types.set(`${a._id.c}.${a._id.s || ''}`, a.n);
  const has = (ct, st) => [...types.keys()].some(k => k === `${ct}.${st}` || (!st && k.startsWith(ct + '.')));
  const count = (ct, st) => types.get(`${ct}.${st}`) || 0;

  // attributs significatifs présents (échantillon)
  const hasStock = !!(await RadarEntity.findOne({ workspaceId, coreType: 'Asset', subtype: 'product', 'attributes.stock': { $exists: true, $ne: null } }).select('_id').lean());
  const hasAssign = !!(await RadarRelation.findOne({ workspaceId, type: 'assigned_to' }).select('_id').lean());
  const hasDerived = !!(await RadarRelation.findOne({ workspaceId, type: 'derived_from' }).select('_id').lean());
  const hasSegments = !!(await RadarEntity.findOne({ workspaceId, coreType: 'Party', 'attributes.segment': { $exists: true } }).select('_id').lean());

  return { types, has, count, hasStock, hasAssign, hasDerived, hasSegments };
}

// Catalogue d'analyseurs. `applies(profile)` = précondition data-driven ; `run` = calcul.
const ANALYZERS = [
  { key: 'financial', label: 'Financier', applies: p => p.has('Transaction', 'invoice'),
    run: (ws) => require('./analytics').financialSummary(ws) },
  { key: 'sales_process', label: 'Processus de vente', applies: p => p.has('Transaction'),
    run: (ws) => require('./process/sales-process').mineSalesProcess(ws) },
  { key: 'bottlenecks', label: 'Goulots de cycle de vie', applies: p => p.hasDerived || p.has('Transaction') || p.has('WorkItem'),
    run: (ws) => require('./analytics').findBottlenecks(ws) },
  { key: 'process_gaps', label: 'Ruptures de flux (appris)', applies: p => p.hasDerived,
    run: (ws) => require('./analytics').findProcessGaps(ws) },
  { key: 'regressions', label: 'Écarts de process (retours en arrière)', applies: p => p.has('Transaction') || p.has('WorkItem'),
    run: (ws) => require('./process/regressions').findStateRegressions(ws) },
  { key: 'stock', label: 'Goulots de stock', applies: p => p.hasStock,
    run: (ws) => require('./analytics').findStockRisks(ws) },
  { key: 'production', label: 'Production', applies: p => p.has('WorkItem', 'work_order'),
    run: async (ws) => ({ orders: await require('../db/models/radar-entity.model').countDocuments({ workspaceId: ws, coreType: 'WorkItem', subtype: 'work_order' }) }) },
  { key: 'workload', label: 'Charge par personne', applies: p => p.hasAssign && p.has('Party', 'person'),
    run: (ws) => require('./people').workloadStats(ws) },
  { key: 'sensors', label: 'Capteurs / mesures', applies: p => p.has('Measurement') || p.has('Asset', 'machine'),
    run: (ws) => require('./sensors').analyzeSensors(ws) },
  { key: 'delays', label: 'Retards & en souffrance', applies: p => p.has('Transaction') || p.has('WorkItem') || p.has('Project'),
    run: (ws) => require('./analytics').findDelays(ws) },
];

/**
 * Découvre les analyses PERTINENTES pour ce workspace et ne lance que celles-là.
 * @returns {Promise<{ profile, activated, skipped, results }>}
 */
async function discoverAndAnalyze(workspaceId, { log = () => {} } = {}) {
  const profile = await profileWorkspace(workspaceId);
  const activated = [], skipped = [], results = {};
  for (const a of ANALYZERS) {
    let ok = false; try { ok = !!a.applies(profile); } catch { ok = false; }
    if (!ok) { skipped.push(a.key); continue; }
    try { results[a.key] = await a.run(workspaceId); activated.push({ key: a.key, label: a.label }); }
    catch (e) { log(`[analysis] ${a.key}: ${e.message}`); skipped.push(a.key); }
  }
  log(`[analysis] activés: ${activated.map(a => a.key).join(', ')} · ignorés (pas de données): ${skipped.join(', ')}`);
  return {
    profile: { types: [...profile.types.entries()].map(([t, n]) => ({ type: t, count: n })), hasStock: profile.hasStock, hasAssign: profile.hasAssign, hasDerived: profile.hasDerived },
    activated, skipped, results,
  };
}

module.exports = { discoverAndAnalyze, profileWorkspace, ANALYZERS };
