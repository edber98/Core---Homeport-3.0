// Tests d'intégration du linker sur vraie base Mongo locale.
// Snapshots réalistes Dolibarr → graphe (entités + relations), dédup, idempotence,
// query de voisinage. Sautés si Mongo injoignable.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_graph_test';

let mongoUp = true;
let RadarSnapshot, RadarEntity, RadarRelation, RadarConnector;
let linkConnector, seedDolibarrMappings, query;
let connector, wsId;

// Données réalistes (champs vérifiés sur l'instance Dolibarr réelle)
const FIXTURES = [
  // tiers
  { entityType: 'party', entityKey: '74', data: { id: '74', name: 'Cartonnage du Château', email: 'contact@cartonnage-chateau.fr', client: '1', fournisseur: '0' } },
  { entityType: 'party', entityKey: '78', data: { id: '78', name: 'ITBS', email: 'christophe.royen@it-bs.fr', client: '0', fournisseur: '1' } },
  // facture client billed_to 74
  { entityType: 'customer_invoice', entityKey: '14', data: { id: '14', ref: 'FA-2026-014', total_ttc: '2542.00', date: 1781568000, statut: '1', paye: '0', socid: '74' } },
  // commande client 74, projet 51
  { entityType: 'order', entityKey: '24', data: { id: '24', ref: 'CO-2026-024', total_ttc: '1200.00', date: 1781568000, statut: '3', socid: '74', fk_project: '51' } },
  // devis client 74
  { entityType: 'quote', entityKey: '15', data: { id: '15', ref: 'DE-2026-015', total_ttc: '980.00', date: 1781568000, statut: '0', socid: '74' } },
  // projet
  { entityType: 'project', entityKey: '51', data: { id: '51', title: 'Infrastructure Cartonnage', statut: '1', socid: '74' } },
  // tâche du projet 51
  { entityType: 'task', entityKey: '8', data: { id: '8', label: 'Installation serveur', status: '0', fk_project: '51' } },
  // ticket client 74
  { entityType: 'ticket', entityKey: '12', data: { id: '12', ref: 'TK-012', subject: 'GED en panne', status: '0', fk_soc: '74' } },
];

test.before(async () => {
  try {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
    await mongoose.connection.db.dropDatabase();
  } catch { mongoUp = false; return; }
  RadarSnapshot = require('../../db/models/radar-snapshot.model');
  RadarEntity = require('../../db/models/radar-entity.model');
  RadarRelation = require('../../db/models/radar-relation.model');
  RadarConnector = require('../../db/models/radar-connector.model');
  ({ linkConnector } = require('../graph/linker'));
  ({ seedDolibarrMappings } = require('../graph/mappings-dolibarr'));
  query = require('../graph/query');

  await seedDolibarrMappings();
  wsId = new mongoose.Types.ObjectId();
  connector = await RadarConnector.create({ workspaceId: wsId, family: 'accounting', providerKey: 'dolibarr', label: 'Dolibarr test', status: 'active' });
  for (const f of FIXTURES) {
    await RadarSnapshot.create({
      workspaceId: wsId, connectorId: connector._id, family: 'accounting',
      entityType: f.entityType, entityKey: f.entityKey, contentHash: 'h-' + f.entityKey,
      data: f.data, firstSeenAt: new Date(), lastSeenAt: new Date(),
    });
  }
});

test.after(async () => {
  if (!mongoUp) return;
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

test('linker : crée les entités attendues depuis les snapshots', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const stats = await linkConnector(connector);
  assert.equal(stats.errors.length, 0, stats.errors.join(' | '));
  // 8 snapshots → 8 entités directes (tiers, facture, commande, devis, projet, tâche, ticket)
  assert.ok(stats.entities.created >= 8, `créées: ${stats.entities.created}`);
  // types présents
  assert.equal(await RadarEntity.countDocuments({ workspaceId: wsId, coreType: 'Transaction', subtype: 'invoice' }), 1);
  assert.equal(await RadarEntity.countDocuments({ workspaceId: wsId, coreType: 'Project' }), 1);
  assert.equal(await RadarEntity.countDocuments({ workspaceId: wsId, coreType: 'WorkItem', subtype: 'ticket' }), 1);
});

test('dédup : le client 74, référencé par facture/commande/devis/projet/ticket, est UNE seule entité', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  // Le tiers 74 a un email → clé canonique email:… ; les relations le référencent par dolibarr:party:74.
  const byEmail = await RadarEntity.find({ workspaceId: wsId, canonicalKey: 'email:contact@cartonnage-chateau.fr' }).lean();
  assert.equal(byEmail.length, 1, 'le client doit être unique');
  assert.deepEqual(byEmail[0].roles, ['client']);
});

test('relations : facture/commande billed_to/client → client, commande part_of projet', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const billed = await RadarRelation.findOne({ workspaceId: wsId, fromKey: 'dolibarr:customer_invoice:14', type: 'party_of', role: 'billed_to' }).lean();
  assert.ok(billed, 'relation billed_to facture→client attendue');
  assert.equal(billed.toKey, 'dolibarr:party:74');
  const partOf = await RadarRelation.findOne({ workspaceId: wsId, fromKey: 'dolibarr:order:24', type: 'part_of' }).lean();
  assert.ok(partOf, 'commande part_of projet attendue');
  assert.equal(partOf.toKey, 'dolibarr:project:51');
});

test('idempotence : re-linker ne duplique ni entités ni relations', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const e1 = await RadarEntity.countDocuments({ workspaceId: wsId });
  const r1 = await RadarRelation.countDocuments({ workspaceId: wsId });
  const stats = await linkConnector(connector);
  assert.equal(stats.entities.created, 0, 'aucune nouvelle entité');
  assert.ok(stats.entities.updated >= 8, 'entités mises à jour, pas recréées');
  assert.equal(await RadarEntity.countDocuments({ workspaceId: wsId }), e1);
  assert.equal(await RadarRelation.countDocuments({ workspaceId: wsId }), r1);
});

test('query : scommande 24 → voisinage (client + projet)', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const n = await query.neighborhood(wsId, 'dolibarr:order:24', { depth: 1 });
  assert.ok(n, 'voisinage trouvé');
  const keys = n.entities.map(e => e.canonicalKey);
  assert.ok(keys.includes('dolibarr:project:51'), 'le projet doit être voisin');
  // le client est référencé par dolibarr:party:74 (clé brute) ; vérifier la relation
  assert.ok(n.relations.some(r => r.type === 'party_of' && r.role === 'client'), 'relation client attendue');
});

test('query : résumé du graphe par type', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const s = await query.graphSummary(wsId);
  assert.ok(s.entities >= 8);
  assert.ok(s.relations >= 5);
  const types = s.byType.map(b => `${b.coreType}.${b.subtype}`);
  assert.ok(types.includes('Transaction.invoice'));
  assert.ok(types.includes('Party.organization'));
});

test('listEntities : filtre par rôle (les fournisseurs)', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const suppliers = await query.listEntities(wsId, { coreType: 'Party', role: 'supplier' });
  assert.equal(suppliers.length, 1);
  assert.equal(suppliers[0].label, 'ITBS');
});

test('fusion cross-source : même client vu par un 2e connecteur → 1 entité, 2 sources', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  // Simule un 2e connecteur (ex: mails) qui voit le même client par email
  const conn2 = await RadarConnector.create({ workspaceId: wsId, family: 'email', providerKey: 'dolibarr', label: 'c2', status: 'active' });
  await RadarSnapshot.create({
    workspaceId: wsId, connectorId: conn2._id, family: 'email', entityType: 'party', entityKey: '999',
    contentHash: 'h2', data: { id: '999', name: 'Cartonnage du Château', email: 'contact@cartonnage-chateau.fr', client: '1' },
    firstSeenAt: new Date(), lastSeenAt: new Date(),
  });
  await linkConnector(conn2);
  const ent = await RadarEntity.find({ workspaceId: wsId, canonicalKey: 'email:contact@cartonnage-chateau.fr' }).lean();
  assert.equal(ent.length, 1, 'toujours une seule entité (dédup par email)');
  assert.equal(ent[0].sources.length, 2, 'deux sources fusionnées');
});
