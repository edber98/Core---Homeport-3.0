// Cascade : supprimer un connecteur purge sa mémoire dérivée. Une entité vue par
// plusieurs connecteurs survit (on retire juste la source). Sauté sans Mongo.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_cleanup_test';
let mongoUp = true;
let RadarSnapshot, RadarEntity, RadarRelation, purgeConnectorData, wsId, connA, connB;

test.before(async () => {
  try {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
    await mongoose.connection.db.dropDatabase();
  } catch { mongoUp = false; return; }
  RadarSnapshot = require('../../db/models/radar-snapshot.model');
  RadarEntity = require('../../db/models/radar-entity.model');
  RadarRelation = require('../../db/models/radar-relation.model');
  ({ purgeConnectorData } = require('../cleanup'));

  wsId = new mongoose.Types.ObjectId();
  connA = new mongoose.Types.ObjectId();
  connB = new mongoose.Types.ObjectId();

  await RadarSnapshot.create({ workspaceId: wsId, connectorId: connA, family: 'crm', entityType: 'party', entityKey: '1', contentHash: 'h', data: { id: '1' }, firstSeenAt: new Date(), lastSeenAt: new Date() });
  // entité issue de A seul → doit disparaître
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Transaction', subtype: 'invoice', canonicalKey: 'dolibarr:customer_invoice:14', label: 'F14', sources: [{ connectorId: connA, providerKey: 'dolibarr', externalId: '14' }] });
  // entité vue par A ET B → doit survivre (détachée de A)
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Party', subtype: 'organization', canonicalKey: 'email:x@y.fr', aliasKeys: ['dolibarr:party:74'], label: 'ACME', sources: [{ connectorId: connA, providerKey: 'dolibarr', externalId: '74' }, { connectorId: connB, providerKey: 'gmail', externalId: 'z' }] });
  // relation facture → tiers
  await RadarRelation.create({ workspaceId: wsId, fromKey: 'dolibarr:customer_invoice:14', toKey: 'dolibarr:party:74', type: 'party_of', role: 'billed_to' });
});

test.after(async () => {
  if (!mongoUp) return;
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

test('purgeConnectorData : snapshots/entités orphelines/relations supprimés, multi-source détachée', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const out = await purgeConnectorData({ workspaceId: wsId, _id: connA });
  assert.equal(out.snapshots, 1, 'snapshot de A supprimé');
  assert.equal(out.entitiesRemoved, 1, 'la facture (source A seule) supprimée');
  assert.equal(out.entitiesDetached, 1, 'le tiers (A+B) détaché de A, pas supprimé');

  // la facture a disparu
  assert.equal(await RadarEntity.countDocuments({ workspaceId: wsId, canonicalKey: 'dolibarr:customer_invoice:14' }), 0);
  // le tiers survit avec seulement la source B
  const party = await RadarEntity.findOne({ workspaceId: wsId, canonicalKey: 'email:x@y.fr' }).lean();
  assert.ok(party, 'le tiers survit');
  assert.equal(party.sources.length, 1);
  assert.equal(String(party.sources[0].connectorId), String(connB));
  // la relation vers la facture supprimée a disparu
  assert.equal(await RadarRelation.countDocuments({ workspaceId: wsId }), 0, 'relation orpheline supprimée');
});

test('purgeConnectorData : idempotent (2e passe ne casse rien)', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const out = await purgeConnectorData({ workspaceId: wsId, _id: connA });
  assert.equal(out.snapshots, 0);
  assert.equal(out.entitiesRemoved, 0);
});
