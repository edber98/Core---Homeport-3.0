// Process mining OBJECT-CENTRIC / cross-logiciel.
//
// Au lieu d'un cycle de vie par type (miner.js), on corrèle les événements de
// PLUSIEURS logiciels autour d'un même CAS (le client). Pour chaque client, on
// reconstitue la chronologie de TOUT ce qui le concerne (devis Dolibarr, dossier
// Nextcloud, projet OpenProject, emails…) → on découvre le flux inter-logiciels
// (« devis validé → dossier + projet créés ») et les actions PARALLÈLES.
//
// Dynamique : les activités sont dérivées des entités/états réels du graphe, pas
// codées en dur. Déterministe, sans LLM.

const { stateFieldOf, canonState } = require('./miner');

// Libellé FR court d'un type d'entité (pour nommer les activités).
const TYPE_FR = {
  'Transaction.invoice': 'Facture', 'Transaction.supplier_invoice': 'Facture fourn.',
  'Transaction.quote': 'Devis', 'Transaction.order': 'Commande', 'Transaction.payment': 'Paiement',
  'Project.project': 'Projet', 'Asset.folder': 'Dossier', 'Document.file': 'Fichier',
  'WorkItem.task': 'Tâche', 'WorkItem.ticket': 'Ticket', 'Communication.email': 'Email',
  'Party.organization': 'Tiers', 'Party.person': 'Contact',
};
function typeFr(coreType, subtype) { return TYPE_FR[`${coreType}.${subtype}`] || subtype || coreType; }
function createdVerb(coreType) {
  if (coreType === 'Communication') return 'reçu';
  if (coreType === 'Asset' || coreType === 'Document' || coreType === 'Project') return 'créé';
  return 'créé';
}
const DAY = 86400000;

/**
 * Découvre les processus cross-logiciel par client.
 * @returns {Promise<{cases, activities, transitions, parallels, variants}>}
 */
// Filtres dynamiques optionnels : `segment` (secteur du client), `kind` (nature de
// projet / catégorie — sémantique I2), `assigneeKey` (personne responsable).
// creationOnly : ne garde que les jalons de CRÉATION par type (Devis→Commande→Facture…),
// sans les transitions d'état → flux métier LISIBLE, sans boucles « refusé→signé »
// (le détail des états reste dans la vue « Par cycle de vie »).
async function mineCrossProcess(workspaceId, { caseRole = 'client', segment = null, kind = null, assigneeKey = null, creationOnly = false } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');
  const RadarDelta = require('../../db/models/radar-delta.model');
  const RadarConnector = require('../../db/models/radar-connector.model');
  const RadarMapping = require('../../db/models/radar-mapping.model');

  const parties = await RadarEntity.find({ workspaceId, coreType: 'Party' }).select('canonicalKey label roles attributes').lean();
  const segMatch = (p) => !segment || p.attributes?.segment === segment || p.attributes?.segmentLabel === segment;
  const caseKeys = new Map();   // caseKey (canonique) -> label
  for (const p of parties) if ((!caseRole || (p.roles || []).includes(caseRole)) && segMatch(p)) caseKeys.set(p.canonicalKey, p.label);
  if (!caseKeys.size) return { cases: 0, activities: [], transitions: [], parallels: [], variants: [] };

  // Entités + index toute-clé (canonique + alias) → entité, pour résoudre relations & deltas
  const entities = await RadarEntity.find({ workspaceId }).select('canonicalKey aliasKeys coreType subtype firstSeenAt sources attributes').lean();
  const entByKey = new Map();
  for (const e of entities) { entByKey.set(e.canonicalKey, e); for (const a of e.aliasKeys || []) entByKey.set(a, e); }
  const resolve = (key) => { const e = entByKey.get(key); return e ? e.canonicalKey : key; };

  // Rattachement entité -> client. Les relations référencent souvent une clé alias
  // (dolibarr:party:74) → on résout vers la clé canonique (email:…) du client.
  const relations = await RadarRelation.find({ workspaceId }).select('fromKey toKey').lean();
  const entityCase = new Map();
  for (const r of relations) {
    const from = resolve(r.fromKey), to = resolve(r.toKey);
    if (caseKeys.has(to) && !caseKeys.has(from) && !entityCase.has(from)) entityCase.set(from, to);
    if (caseKeys.has(from) && !caseKeys.has(to) && !entityCase.has(to)) entityCase.set(to, from);
  }

  // Nom convivial du LOGICIEL d'origine (pour afficher le système à chaque étape).
  const SYS_FR = { dolibarr: 'Dolibarr', nextcloud: 'Nextcloud', nextcloudfiles: 'Nextcloud', openproject: 'OpenProject', gmail: 'Email', smtp_imap: 'Email', home_assistant: 'Home Assistant', sap: 'SAP' };
  const friendlySystem = (k) => SYS_FR[String(k || '').toLowerCase()] || (k ? String(k) : 'Inconnu');
  const systemOfKey = (canonicalKey) => friendlySystem(String(canonicalKey).split(':')[0]);
  const systemByActivity = {};   // activité → logiciel (Dolibarr / Nextcloud / Email…)
  const typeByActivity = {};     // activité → "coreType.subtype" (pour ouvrir le cycle détaillé)

  // Événement de CRÉATION pour chaque entité rattachée à un cas (couvre tous les logiciels)
  const eventsByCase = new Map();   // caseKey -> [{activity, at}]
  const addEvent = (caseKey, activity, at, system, typeKey) => {
    if (!caseKey || !at) return;
    const arr = eventsByCase.get(caseKey) || []; arr.push({ activity, at: new Date(at).getTime() }); eventsByCase.set(caseKey, arr);
    if (system && !systemByActivity[activity]) systemByActivity[activity] = system;
    if (typeKey && !typeByActivity[activity]) typeByActivity[activity] = typeKey;
  };
  // VRAIE date métier de l'entité (date du document) plutôt que firstSeenAt (= heure
  // de synchro, identique pour tous → ordre des parcours incohérent). Unix(s/ms) ou ISO.
  const realDate = (e) => {
    const a = e.attributes || {};
    const cand = a.date || a.startDate || a.dueDate || a.modifiedAt || a.createdAt;
    if (cand != null && cand !== '') {
      const n = Number(cand);
      if (Number.isFinite(n) && n > 0) return new Date(n < 1e12 ? n * 1000 : n);  // unix s ou ms
      const d = new Date(cand); if (!isNaN(d)) return d;
    }
    return e.firstSeenAt;
  };
  // filtre par PERSONNE responsable : ensemble des entités assignées à cette personne
  let assignedSet = null;
  if (assigneeKey) {
    assignedSet = new Set();
    const ar = await RadarRelation.find({ workspaceId, type: 'assigned_to', toKey: assigneeKey }).select('fromKey').lean();
    for (const r of ar) { const ck = resolve(r.fromKey); assignedSet.add(ck); assignedSet.add(r.fromKey); }
  }
  for (const e of entities) {
    if (caseKeys.has(e.canonicalKey)) continue;
    const c = entityCase.get(e.canonicalKey);
    if (!c) continue;
    if (kind && e.attributes?.kind !== kind) continue;                         // filtre sémantique (nature/catégorie)
    if (assignedSet && !assignedSet.has(e.canonicalKey)) continue;             // filtre par responsable
    const sys = e.sources && e.sources[0] ? friendlySystem(e.sources[0].providerKey) : systemOfKey(e.canonicalKey);
    addEvent(c, `${typeFr(e.coreType, e.subtype)} ${createdVerb(e.coreType)}`, realDate(e), sys, `${e.coreType}.${e.subtype || ''}`);
  }

  // Transitions d'état depuis les deltas (cycle de vie : devis validé, facture payée…)
  const provByConn = new Map((await RadarConnector.find({ workspaceId }).select('providerKey').lean()).map(c => [String(c._id), c.providerKey]));
  const mappings = await RadarMapping.find({ status: 'active', $or: [{ workspaceId }, { workspaceId: null }] }).lean();
  const mapByType = new Map();
  for (const m of mappings) { if (stateFieldOf(m)) { const cur = mapByType.get(m.rawEntityType); if (!cur || (m.workspaceId && !cur.workspaceId)) mapByType.set(m.rawEntityType, m); } }

  const deltas = creationOnly ? [] : await RadarDelta.find({ workspaceId }).select('entityType entityKey type after occurredAt connectorId').lean();
  for (const d of deltas) {
    const mapping = mapByType.get(d.entityType); if (!mapping) continue;
    const prov = provByConn.get(String(d.connectorId));
    const ent = entByKey.get(`${prov}:${d.entityType}:${d.entityKey}`) || entByKey.get(d.entityKey);
    if (!ent) continue;
    const c = entityCase.get(ent.canonicalKey); if (!c) continue;
    if (d.type === 'created') continue;     // déjà couvert par l'événement de création
    const sf = stateFieldOf(mapping);
    const st = canonState(d.after ? d.after[sf.rawField] : undefined, sf.valueMap);
    if (!st) continue;
    addEvent(c, `${typeFr(mapping.target.coreType, mapping.target.subtype)} ${st}`, d.occurredAt, friendlySystem(prov));
  }

  // Agrégation : DFG cross-logiciel + variantes + parallélisme
  const actFreq = new Map(), trans = new Map(), variants = new Map(), parallels = new Map();
  let caseCount = 0;
  for (const [, evs] of eventsByCase) {
    if (!evs.length) continue;
    caseCount++;
    evs.sort((a, b) => a.at - b.at);
    for (const e of evs) actFreq.set(e.activity, (actFreq.get(e.activity) || 0) + 1);
    // parallélisme : activités du même cas à < 1 jour d'écart
    for (let i = 0; i < evs.length; i++) for (let j = i + 1; j < evs.length; j++) {
      if (Math.abs(evs[i].at - evs[j].at) <= DAY && evs[i].activity !== evs[j].activity) {
        const k = [evs[i].activity, evs[j].activity].sort().join('  ∥  ');
        parallels.set(k, (parallels.get(k) || 0) + 1);
      }
    }
    // DFG : parcours client = PREMIÈRE occurrence de chaque activité dans l'ordre
    // chronologique. On déduplique globalement (pas seulement les consécutifs) :
    // plusieurs factures/commandes d'un même client ne doivent pas créer une
    // séquence en boucle « Facture → Commande → Facture → … ».
    const seenAct = new Set(); const seq = [];
    for (const e of evs) { if (!seenAct.has(e.activity)) { seenAct.add(e.activity); seq.push(e); } }
    for (let i = 0; i < seq.length - 1; i++) {
      const k = `${seq[i].activity}→${seq[i + 1].activity}`;
      const t = trans.get(k) || { count: 0, durs: [] };
      t.count++; const d = seq[i + 1].at - seq[i].at; if (d >= 0) t.durs.push(d);
      trans.set(k, t);
    }
    variants.set(seq.map(s => s.activity).join(' → '), (variants.get(seq.map(s => s.activity).join(' → ')) || 0) + 1);
  }
  const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

  return {
    cases: caseCount,
    systemByActivity,
    typeByActivity,
    activities: [...actFreq.entries()].map(([activity, count]) => ({ activity, count, system: systemByActivity[activity] || null })).sort((a, b) => b.count - a.count),
    transitions: [...trans.entries()].map(([k, t]) => { const [from, to] = k.split('→'); return { from, to, count: t.count, avgDurationMs: Math.round(mean(t.durs)) }; }).sort((a, b) => b.count - a.count),
    parallels: [...parallels.entries()].map(([k, count]) => ({ activities: k.split('  ∥  '), count })).sort((a, b) => b.count - a.count).slice(0, 12),
    variants: [...variants.entries()].map(([sequence, count]) => ({ sequence, count })).sort((a, b) => b.count - a.count).slice(0, 10),
  };
}

module.exports = { mineCrossProcess, typeFr };
