// P2 — Watch specs Dolibarr.
//   Partie A (pure, toujours) : cohérence du bloc radar du manifest (validation,
//   chaque watch a un mapping, chaque via réfère une capacité déclarée).
//   Partie B (live, sautée sans Dolibarr/Mongo) : chaîne RÉELLE de bout en bout —
//   collecte live → snapshots → linker → graphe — sur le Dolibarr de test, dans un
//   workspace jetable, avec restauration du Provider.radar.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MANIFEST = path.resolve(__dirname, '../../plugins/repos/dolibarr/manifest.json');
const RADAR = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).providers[0].radar;

// ── A. Cohérence pure ──

test('P2 — le bloc radar Dolibarr est valide', () => {
  const { validateRadarBlocks } = require('../families');
  const v = validateRadarBlocks(RADAR);
  assert.equal(v.ok, true, v.errors.join(' | '));
});

test('P2 — chaque watch.entity a un mapping et chaque via une capacité déclarée', () => {
  const { listWatchSpecs } = require('../capability-registry');
  const { DOLIBARR_MAPPINGS } = require('../graph/mappings-dolibarr');
  const mapTypes = new Set(DOLIBARR_MAPPINGS.map(m => m.rawEntityType));
  let total = 0;
  for (const block of RADAR) {
    const specs = listWatchSpecs({ providerRadar: RADAR, family: block.family });
    for (const s of specs) {
      total++;
      assert.ok(mapTypes.has(s.entity), `watch ${s.entity} sans mapping`);
      assert.ok(block.capabilities[s.via], `via ${s.via} non déclarée dans ${block.family}`);
      assert.ok(s.key, `watch ${s.entity} sans key`);
    }
  }
  assert.ok(total >= 8, `au moins 8 watch attendues, eu ${total}`);
});

// ── B. Chaîne live (collecte réelle → graphe) ──

const API_KEY_DB = process.env.MONGO_URL || 'mongodb://localhost:27017/';
const DB = process.env.MONGO_DB_NAME || 'homeport';
let live = true, skipReason = null;
let Provider, RadarConnector, RadarSnapshot, RadarDelta, RadarEntity, RadarRelation;
let collectConnector, linkConnector, graph, registry;
let connector, wsId, origRadar, providerDoc, credId;

test.before(async () => {
  try {
    await mongoose.connect(API_KEY_DB + DB, { serverSelectionTimeoutMS: 2500 });
  } catch { live = false; skipReason = 'MongoDB injoignable'; return; }
  Provider = require('../../db/models/provider.model');
  RadarConnector = require('../../db/models/radar-connector.model');
  RadarSnapshot = require('../../db/models/radar-snapshot.model');
  RadarDelta = require('../../db/models/radar-delta.model');
  RadarEntity = require('../../db/models/radar-entity.model');
  RadarRelation = require('../../db/models/radar-relation.model');
  ({ collectConnector } = require('../collector'));
  ({ linkConnector } = require('../graph/linker'));
  graph = require('../graph/query');
  await require('../graph/mappings-dolibarr').seedDolibarrMappings();

  const Credential = require('../../db/models/credential.model');
  const cred = await Credential.findOne({ providerKey: 'dolibarr' }).select('_id').lean();
  if (!cred) { live = false; skipReason = 'pas de credential dolibarr'; return; }
  credId = cred._id;

  ({ registry } = require('../../plugins/registry'));
  await registry.loadFromDir(path.resolve(__dirname, '../../plugins/repos'), null);

  providerDoc = await Provider.findOne({ key: 'dolibarr' });
  if (!providerDoc) { live = false; skipReason = 'provider dolibarr absent'; return; }
  origRadar = providerDoc.radar;
  providerDoc.radar = RADAR;            // injecte les watch (comme le ferait l'import)
  providerDoc.markModified('radar');
  await providerDoc.save();

  wsId = new mongoose.Types.ObjectId(); // workspace jetable
  connector = await RadarConnector.create({
    workspaceId: wsId, family: 'crm', providerKey: 'dolibarr',
    credentialId: credId, label: 'Dolibarr P2 test', status: 'active',
  });
});

test.after(async () => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    if (wsId) {
      await Promise.all([
        RadarSnapshot.deleteMany({ workspaceId: wsId }),
        RadarDelta.deleteMany({ workspaceId: wsId }),
        RadarEntity.deleteMany({ workspaceId: wsId }),
        RadarRelation.deleteMany({ workspaceId: wsId }),
        RadarConnector.deleteMany({ workspaceId: wsId }),
      ]);
    }
    if (providerDoc && origRadar !== undefined) {
      providerDoc.radar = origRadar; providerDoc.markModified('radar'); await providerDoc.save();
    }
  } finally {
    await mongoose.disconnect();
  }
});

test('P2 live — collecte réelle crm : snapshots tiers/devis/commandes créés', { timeout: 120_000 }, async (t) => {
  if (!live) return t.skip(skipReason);
  const summary = await collectConnector(connector, { log: () => {} });
  assert.ok(summary, 'résumé de collecte');
  // baseline : pas de deltas, mais des snapshots
  const snaps = await RadarSnapshot.countDocuments({ workspaceId: wsId });
  assert.ok(snaps > 0, `snapshots créés (eu ${snaps}); erreurs: ${summary.errors.join(' | ')}`);
  const parties = await RadarSnapshot.countDocuments({ workspaceId: wsId, entityType: 'party' });
  assert.ok(parties > 0, `tiers observés (eu ${parties})`);
  console.log(`[test] P2 collecte: ${snaps} snapshots, ${parties} tiers`);
});

test('P2 live — linker : le graphe se peuple (entités + relations réelles)', { timeout: 60_000 }, async (t) => {
  if (!live) return t.skip(skipReason);
  const stats = await linkConnector(connector, { log: () => {} });
  assert.equal(stats.errors.length, 0, stats.errors.join(' | '));
  const parties = await RadarEntity.countDocuments({ workspaceId: wsId, coreType: 'Party' });
  assert.ok(parties > 0, `entités Party créées (eu ${parties})`);
  const summary = await graph.graphSummary(wsId);
  console.log(`[test] P2 graphe: ${summary.entities} entités, ${summary.relations} relations, types=${summary.byType.map(b => b.coreType + '.' + b.subtype).join(',')}`);
  assert.ok(summary.entities > 0, 'graphe peuplé');
});
