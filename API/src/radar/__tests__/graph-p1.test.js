// P1 — Graphe connecté : après le linker, la vue graphe et le voisinage résolvent
// les arêtes vers les entités à CLÉ FORTE (ex: facture → tiers stocké sous email).
// C'est ce qui rend le graphe affichable (vflow) sans nœuds orphelins.
// Sauté si Mongo injoignable.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_graph_p1_test';

let mongoUp = true;
let RadarSnapshot, RadarConnector, linkConnector, seedDolibarrMappings, graph;
let connector, wsId;

const FIXTURES = [
  { entityType: 'party', entityKey: '74', data: { id: '74', name: 'Cartonnage du Château', email: 'contact@cartonnage.fr', client: '1', fournisseur: '0' } },
  { entityType: 'customer_invoice', entityKey: '14', data: { id: '14', ref: 'FA-2026-014', total_ttc: '2542.00', date: 1781568000, statut: '1', paye: '0', socid: '74' } },
  { entityType: 'customer_invoice', entityKey: '15', data: { id: '15', ref: 'FA-2026-015', total_ttc: '880.00', date: 1781568000, statut: '1', paye: '1', socid: '74' } },
  { entityType: 'project', entityKey: '51', data: { id: '51', title: 'Infra Cartonnage', statut: '1', socid: '74' } },
];

test.before(async () => {
  try {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
    await mongoose.connection.db.dropDatabase();
  } catch { mongoUp = false; return; }
  RadarSnapshot = require('../../db/models/radar-snapshot.model');
  RadarConnector = require('../../db/models/radar-connector.model');
  ({ linkConnector } = require('../graph/linker'));
  ({ seedDolibarrMappings } = require('../graph/mappings-dolibarr'));
  graph = require('../graph/query');

  await seedDolibarrMappings();
  wsId = new mongoose.Types.ObjectId();
  connector = await RadarConnector.create({ workspaceId: wsId, family: 'accounting', providerKey: 'dolibarr', label: 'D', status: 'active' });
  for (const f of FIXTURES) {
    await RadarSnapshot.create({
      workspaceId: wsId, connectorId: connector._id, family: 'accounting',
      entityType: f.entityType, entityKey: f.entityKey, contentHash: 'h-' + f.entityType + f.entityKey,
      data: f.data, firstSeenAt: new Date(), lastSeenAt: new Date(),
    });
  }
  await linkConnector(connector);
});

test.after(async () => {
  if (!mongoUp) return;
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

test('le tiers à clé forte porte un alias provider:type:id', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const RadarEntity = require('../../db/models/radar-entity.model');
  const party = await RadarEntity.findOne({ workspaceId: wsId, canonicalKey: 'email:contact@cartonnage.fr' }).lean();
  assert.ok(party, 'tiers stocké sous clé forte email');
  assert.ok((party.aliasKeys || []).includes('dolibarr:party:74'), `alias attendu, eu ${JSON.stringify(party.aliasKeys)}`);
});

test('graphData : graphe CONNECTÉ — arêtes résolues vers la clé forte du tiers', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const g = await graph.graphData(wsId, {});
  // 4 entités (1 tiers + 2 factures + 1 projet)
  assert.equal(g.entities.length, 4, `entités: ${g.entities.length}`);
  // les 2 factures + le projet pointent vers le tiers via sa CLÉ FORTE (pas l'alias brut)
  const toParty = g.relations.filter(r => r.to === 'email:contact@cartonnage.fr');
  assert.ok(toParty.length >= 3, `arêtes vers le tiers résolues: ${toParty.length} (relations=${JSON.stringify(g.relations)})`);
  // aucune arête ne pointe vers une clé brute non résolue
  assert.ok(!g.relations.some(r => r.to === 'dolibarr:party:74'), 'aucune arête non résolue');
});

test('neighborhood du tiers : retrouve ses factures (relations entrantes via alias)', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const n = await graph.neighborhood(wsId, 'email:contact@cartonnage.fr', { depth: 1 });
  assert.ok(n, 'voisinage trouvé');
  const keys = n.entities.map(e => e.canonicalKey);
  assert.ok(keys.includes('dolibarr:customer_invoice:14'), 'facture 14 voisine');
  assert.ok(keys.includes('dolibarr:customer_invoice:15'), 'facture 15 voisine');
  assert.ok(keys.includes('dolibarr:project:51'), 'projet voisin');
});

test('graphSummary : compte entités + relations par type', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const s = await graph.graphSummary(wsId);
  assert.equal(s.entities, 4);
  assert.ok(s.relations >= 3);
  assert.ok(s.byRelationType.some(b => b.type === 'party_of'), 'party_of compté');
});

test('lineage : remonte snapshot brut + mapping appliqué', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const l = await graph.lineage(wsId, 'dolibarr:customer_invoice:14');
  assert.ok(l && l.entity, 'entité');
  assert.ok(l.sources.length >= 1, 'au moins une source');
  assert.equal(l.sources[0].snapshot.data.ref, 'FA-2026-014', 'snapshot brut présent');
  assert.ok(l.sources[0].mapping, 'mapping appliqué tracé');
  assert.equal(l.sources[0].mapping.target.coreType, 'Transaction');
});
