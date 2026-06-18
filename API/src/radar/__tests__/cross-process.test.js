// Process mining CROSS-LOGICIEL : pour un même client, corréler devis (Dolibarr),
// dossier (Nextcloud) et projet (OpenProject) → flux inter-logiciels + parallèle.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_cross_test';
let mongoUp = true, RadarEntity, RadarRelation, RadarDelta, RadarConnector, mineCrossProcess, wsId;

const T = (s) => new Date(s);

test.before(async () => {
  try { await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 }); await mongoose.connection.db.dropDatabase(); }
  catch { mongoUp = false; return; }
  RadarEntity = require('../../db/models/radar-entity.model');
  RadarRelation = require('../../db/models/radar-relation.model');
  RadarDelta = require('../../db/models/radar-delta.model');
  RadarConnector = require('../../db/models/radar-connector.model');
  ({ mineCrossProcess } = require('../process/cross-miner'));
  await require('../graph/mappings-dolibarr').seedDolibarrMappings();

  wsId = new mongoose.Types.ObjectId();
  const conn = await RadarConnector.create({ workspaceId: wsId, family: 'crm', providerKey: 'dolibarr', label: 'd', status: 'active' });

  // entités : client + devis (Dolibarr) + dossier (Nextcloud) + projet (OpenProject)
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Party', subtype: 'organization', canonicalKey: 'email:c@x.fr', label: 'Client X', roles: ['client'], firstSeenAt: T('2026-05-01') });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Transaction', subtype: 'quote', canonicalKey: 'dolibarr:quote:5', label: 'DE-5', firstSeenAt: T('2026-05-02') });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Asset', subtype: 'folder', canonicalKey: 'nextcloud:folder:/Clients/X', label: 'X', firstSeenAt: T('2026-05-11') });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Project', subtype: 'project', canonicalKey: 'openproject:project:op1', label: 'Projet X', firstSeenAt: T('2026-05-11') });

  // relations vers le client
  for (const from of ['dolibarr:quote:5', 'nextcloud:folder:/Clients/X', 'openproject:project:op1']) {
    await RadarRelation.create({ workspaceId: wsId, fromKey: from, toKey: 'email:c@x.fr', type: 'relates_to', role: 'client' });
  }

  // cycle de vie du devis : créé (05-02) puis validé (05-10)
  await RadarDelta.create({ workspaceId: wsId, connectorId: conn._id, family: 'crm', entityType: 'quote', entityKey: '5', type: 'created', after: { statut: '0' }, occurredAt: T('2026-05-02'), status: 'consumed' });
  await RadarDelta.create({ workspaceId: wsId, connectorId: conn._id, family: 'crm', entityType: 'quote', entityKey: '5', type: 'updated', after: { statut: '1' }, occurredAt: T('2026-05-10'), status: 'consumed' });
});

test.after(async () => { if (!mongoUp) return; await mongoose.connection.db.dropDatabase(); await mongoose.disconnect(); });

test('mineCrossProcess : 1 client, activités cross-logiciel, parallèle dossier∥projet', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const res = await mineCrossProcess(wsId, {});
  assert.equal(res.cases, 1, 'un cas client');
  const acts = res.activities.map(a => a.activity);
  assert.ok(acts.includes('Devis créé'), 'Devis créé');
  assert.ok(acts.includes('Devis validé'), 'Devis validé (transition d\'état)');
  assert.ok(acts.includes('Dossier créé'), 'Dossier Nextcloud');
  assert.ok(acts.includes('Projet créé'), 'Projet OpenProject');
  // parallélisme cross-logiciel : dossier (Nextcloud) ∥ projet (OpenProject) le même jour
  const par = res.parallels.find(p => p.activities.includes('Dossier créé') && p.activities.includes('Projet créé'));
  assert.ok(par, 'parallèle Dossier ∥ Projet détecté');
  // enchaînement : devis validé précède la création du dossier
  const tr = res.transitions.find(x => x.from === 'Devis validé' && x.to === 'Dossier créé');
  assert.ok(tr, 'transition Devis validé → Dossier créé');
  console.log(`[test] cross : variante #1 = ${res.variants[0].sequence}`);
});
