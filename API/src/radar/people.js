// Mapping des UTILISATEURS / personnes du système — « qui est en charge de quoi ».
//
// Au-delà des clients, le cerveau doit connaître les PERSONNES qui travaillent
// (assignées aux tâches/tickets/projets) pour produire des statistiques de CHARGE
// par personne et par organisation, et permettre de filtrer la mémoire par responsable.
//
// - les personnes sont des Party.person (rôle 'employee') ;
// - l'affectation est une relation `assigned_to` (workItem → personne) ;
// - workloadStats agrège la charge (nb d'items, par statut) par personne et par secteur.

const STATE_FIELDS = ['status', 'state'];
function stateOf(attrs) { for (const f of STATE_FIELDS) if (attrs && attrs[f]) return String(attrs[f]); return 'inconnu'; }
const OPEN_STATES = /^(à faire|a faire|en cours|ouvert|non lu|lu|assigné|en attente|brouillon|émise|validé|en production)/i;

/**
 * Statistiques de CHARGE par personne (et par organisation employeuse).
 * @returns {Promise<{ people, byPerson, totals }>}
 */
async function workloadStats(workspaceId) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const RadarRelation = require('../db/models/radar-relation.model');

  const people = await RadarEntity.find({ workspaceId, coreType: 'Party', subtype: 'person' }).select('canonicalKey aliasKeys label attributes').lean();
  if (!people.length) return { people: 0, byPerson: [], totals: { assigned: 0, open: 0 } };
  const keyToPerson = new Map();
  for (const p of people) { keyToPerson.set(p.canonicalKey, p); for (const a of p.aliasKeys || []) keyToPerson.set(a, p); }

  // affectations
  const rels = await RadarRelation.find({ workspaceId, type: 'assigned_to' }).select('fromKey toKey').lean();
  const itemKeys = rels.map(r => r.fromKey);
  const items = await RadarEntity.find({ workspaceId, $or: [{ canonicalKey: { $in: itemKeys } }, { aliasKeys: { $in: itemKeys } }] })
    .select('canonicalKey aliasKeys coreType subtype label attributes').lean();
  const itemByKey = new Map();
  for (const it of items) { itemByKey.set(it.canonicalKey, it); for (const a of it.aliasKeys || []) itemByKey.set(a, it); }

  const stats = new Map();   // personKey → { label, org, total, open, done, byType:{} }
  for (const r of rels) {
    const person = keyToPerson.get(r.toKey); if (!person) continue;
    const item = itemByKey.get(r.fromKey); if (!item) continue;
    const s = stats.get(person.canonicalKey) || { person: person.label, org: person.attributes?.org || null, total: 0, open: 0, done: 0, byType: {} };
    s.total++;
    const st = stateOf(item.attributes);
    if (/termin|payé|fermé|résolu|livré|signé/i.test(st)) s.done++; else if (OPEN_STATES.test(st)) s.open++;
    const tk = item.subtype || item.coreType; s.byType[tk] = (s.byType[tk] || 0) + 1;
    stats.set(person.canonicalKey, s);
  }

  const byPerson = [...stats.entries()].map(([key, s]) => ({ personKey: key, ...s, charge: s.open })).sort((a, b) => b.open - a.open);
  const totals = { assigned: rels.length, open: byPerson.reduce((n, p) => n + p.open, 0) };
  return { people: people.length, byPerson, totals };
}

/**
 * Crée une ÉQUIPE (Party.person) et AFFECTE les tâches/tickets/projets non assignés
 * (round-robin) pour donner de la matière au mapping « qui fait quoi ». Idempotent.
 * @returns {Promise<{ team, assigned }>}
 */
async function seedTeamAndAssign(workspaceId, { team = ['Claire Dubois', 'Marc Lefèvre', 'Sophie Nguyen', 'Yanis Bernard'] } = {}) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const RadarRelation = require('../db/models/radar-relation.model');
  const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
  const now = new Date();
  const members = [];
  for (const name of team) {
    const key = `email:${slug(name)}@kinn.local`;
    await RadarEntity.updateOne({ workspaceId, canonicalKey: key },
      { $set: { coreType: 'Party', subtype: 'person', label: name, roles: ['employee'], attributes: { org: 'KINN' }, sources: [{ providerKey: 'internal', externalId: key }] },
        $setOnInsert: { firstSeenAt: now, lastSeenAt: now } }, { upsert: true });
    members.push(key);
  }
  // affecte les items de travail non encore assignés
  const items = await RadarEntity.find({ workspaceId, coreType: 'WorkItem' }).select('canonicalKey').lean();
  const already = new Set((await RadarRelation.find({ workspaceId, type: 'assigned_to' }).select('fromKey').lean()).map(r => r.fromKey));
  let assigned = 0, i = 0;
  for (const it of items) {
    if (already.has(it.canonicalKey)) continue;
    const who = members[i % members.length]; i++;
    await RadarRelation.updateOne({ workspaceId, fromKey: it.canonicalKey, toKey: who, type: 'assigned_to', role: 'assignee' },
      { $set: { confidence: 1, source: 'simulation' } }, { upsert: true });
    assigned++;
  }
  return { team: members.length, assigned };
}

module.exports = { workloadStats, seedTeamAndAssign };
