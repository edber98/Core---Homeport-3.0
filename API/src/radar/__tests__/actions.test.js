// Actions (S4) : fusion de doublons (ré-aiguillage des relations) + rattachement ;
// et échéances/SLA (R4.3). Sauté si Mongo injoignable.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { parseDate } = require('../deadlines');

test('parseDate : unix s/ms, ISO', () => {
  assert.equal(parseDate(1781568000), 1781568000000);
  assert.ok(parseDate('2026-09-01') > 0);
  assert.equal(parseDate(''), null);
});

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_actions_test';
let mongoUp = true, RadarEntity, RadarRelation, wsId;

test.before(async () => {
  try { await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 }); await mongoose.connection.db.dropDatabase(); }
  catch { mongoUp = false; return; }
  RadarEntity = require('../../db/models/radar-entity.model');
  RadarRelation = require('../../db/models/radar-relation.model');
  wsId = new mongoose.Types.ObjectId();
});
test.after(async () => { if (!mongoUp) return; await mongoose.connection.db.dropDatabase(); await mongoose.disconnect(); });

test('mergeEntities : fusionne le doublon et ré-aiguille les relations', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const { mergeEntities } = require('../actions');
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Party', subtype: 'organization', canonicalKey: 'email:joly@x.fr', label: 'Joly Formations', roles: ['client'], sources: [{ providerKey: 'dolibarr', externalId: '1' }] });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Party', subtype: 'organization', canonicalKey: 'dolibarr:party:47', label: 'JOLY FORMATIONS', roles: ['client'], sources: [{ providerKey: 'dolibarr', externalId: '47' }] });
  await RadarRelation.create({ workspaceId: wsId, fromKey: 'dolibarr:customer_invoice:5', toKey: 'dolibarr:party:47', type: 'party_of', role: 'billed_to' });

  const r = await mergeEntities(wsId, 'email:joly@x.fr', 'dolibarr:party:47');
  assert.equal(r.ok, true);
  assert.ok(r.rewired >= 1, 'relation ré-aiguillée');
  // le doublon a disparu
  assert.equal(await RadarEntity.countDocuments({ workspaceId: wsId, canonicalKey: 'dolibarr:party:47' }), 0);
  // l'entité gardée a récupéré l'alias + 2 sources
  const keep = await RadarEntity.findOne({ workspaceId: wsId, canonicalKey: 'email:joly@x.fr' }).lean();
  assert.ok(keep.aliasKeys.includes('dolibarr:party:47'));
  assert.equal(keep.sources.length, 2);
  // la relation pointe désormais vers l'entité gardée
  const rel = await RadarRelation.findOne({ workspaceId: wsId, fromKey: 'dolibarr:customer_invoice:5' }).lean();
  assert.equal(rel.toKey, 'email:joly@x.fr');
});

test('applyCorrelation : rattache un dossier à un client', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const { applyCorrelation } = require('../actions');
  await applyCorrelation(wsId, 'nextcloud:folder:/X', 'email:joly@x.fr', 'client');
  const rel = await RadarRelation.findOne({ workspaceId: wsId, fromKey: 'nextcloud:folder:/X', type: 'relates_to' }).lean();
  assert.ok(rel && rel.toKey === 'email:joly@x.fr' && rel.source === 'user');
});

test('findDeadlines : retard + échéance proche, ignore terminé et lointain', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const { findDeadlines } = require('../deadlines');
  const day = 86400000, now = Date.now();
  await RadarEntity.create({ workspaceId: wsId, coreType: 'WorkItem', subtype: 'task', canonicalKey: 'op:t1', label: 'Livraison A', attributes: { status: 'en cours', dueDate: new Date(now - 3 * day).toISOString() } });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Transaction', subtype: 'invoice', canonicalKey: 'd:i1', label: 'Facture B', attributes: { state: 'émise', date_lim_reglement: Math.floor((now + 5 * day) / 1000) } });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'WorkItem', subtype: 'task', canonicalKey: 'op:t2', label: 'Tâche lointaine', attributes: { status: 'en cours', dueDate: new Date(now + 200 * day).toISOString() } });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Transaction', subtype: 'invoice', canonicalKey: 'd:i2', label: 'Facture payée', attributes: { state: 'payée', date_lim_reglement: Math.floor((now - 2 * day) / 1000) } });

  const dl = await findDeadlines(wsId);
  const labels = dl.map(d => d.label);
  assert.ok(labels.includes('Livraison A') && dl.find(d => d.label === 'Livraison A').overdue, 'retard détecté');
  assert.ok(labels.includes('Facture B'), 'échéance proche détectée');
  assert.ok(!labels.includes('Tâche lointaine'), 'lointain exclu');
  assert.ok(!labels.includes('Facture payée'), 'terminé exclu');
});
