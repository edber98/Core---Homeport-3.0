// Tests d'intégration de l'observation sur une VRAIE base MongoDB locale
// (base jetable homeport_radar_obs_test, droppée avant/après).
// Sautés si Mongo n'est pas joignable sur localhost:27017.
//
// Scénario : un provider fictif "fakeacct" (famille accounting) dont le
// handler est enregistré dans le registry plugins et renvoie un état de
// factures mutable — on déroule tout le cycle de vie de l'observation.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_radar_obs_test';

let mongoUp = true;
let Provider, Credential, RadarConnector, RadarSnapshot, RadarDelta;
let collectConnector, runSchedulerPass;
let connector;

// État mutable renvoyé par le handler fictif
let invoices = [];
let lastSeenCredentials = null;
let handlerShouldThrow = false;

test.before(async () => {
  try {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
    await mongoose.connection.db.dropDatabase();
  } catch {
    mongoUp = false;
    return;
  }
  Provider = require('../../db/models/provider.model');
  Credential = require('../../db/models/credential.model');
  RadarConnector = require('../../db/models/radar-connector.model');
  RadarSnapshot = require('../../db/models/radar-snapshot.model');
  RadarDelta = require('../../db/models/radar-delta.model');
  ({ collectConnector } = require('../collector'));
  ({ runSchedulerPass } = require('../scheduler'));

  // Handler fictif dans le registry plugins (signature standard node,msg,inputs,opts)
  const { registry } = require('../../plugins/registry');
  registry.register('fakeacct_invoices_list', async (node, msg, inputs, opts) => {
    if (handlerShouldThrow) throw new Error('boom_provider_down');
    lastSeenCredentials = opts && opts.credentials;
    return { ok: true, totalCount: invoices.length, invoices: JSON.parse(JSON.stringify(invoices)) };
  });

  await Provider.create({
    key: 'fakeacct', name: 'FakeAcct', title: 'Compta fictive', enabled: true,
    radar: [{
      family: 'accounting',
      capabilities: { listSupplierInvoices: { template: 'fakeacct_invoices_list' } },
      watch: [{ entity: 'supplier_invoice', via: 'listSupplierInvoices', key: 'id', hashFields: ['state', 'amount_total'], detectDeletions: true, itemsField: 'invoices' }],
    }],
  });

  const { encrypt } = require('../../utils/enc');
  const cred = await Credential.create({
    name: 'FakeAcct creds', providerKey: 'fakeacct',
    workspaceId: new mongoose.Types.ObjectId(),
    secret: encrypt({ apiKey: 'sk-fake-123' }),
  });

  connector = await RadarConnector.create({
    workspaceId: cred.workspaceId, family: 'accounting', providerKey: 'fakeacct',
    credentialId: cred._id, label: 'Compta fictive', status: 'pending',
    pollingPolicy: { intervalMs: 60_000 },
  });
});

test.after(async () => {
  if (!mongoUp) return;
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

test('baseline : snapshots écrits, AUCUN delta, credentials déchiffrés transmis au handler', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  invoices = [
    { id: 101, state: 'draft', amount_total: 1200, partner: 'ABC' },
    { id: 102, state: 'posted', amount_total: 2542, partner: 'Schneider' },
  ];
  const s = await collectConnector(connector);
  assert.equal(s.ok, true);
  assert.equal(s.baseline, true);
  assert.equal(s.deltas, 0);
  assert.equal(await RadarSnapshot.countDocuments({ connectorId: connector._id }), 2);
  assert.equal(await RadarDelta.countDocuments({ connectorId: connector._id }), 0);
  assert.deepEqual(lastSeenCredentials, { apiKey: 'sk-fake-123' });
  assert.ok(connector.baselineDoneAt, 'baselineDoneAt doit être posé');
  assert.equal(connector.status, 'active');
});

test('aucun changement → aucun delta, lastSeenAt avancé', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const before = await RadarSnapshot.findOne({ connectorId: connector._id, entityKey: '101' }).lean();
  const s = await collectConnector(connector, { now: new Date(Date.now() + 1000) });
  assert.equal(s.deltas, 0);
  const after = await RadarSnapshot.findOne({ connectorId: connector._id, entityKey: '101' }).lean();
  assert.ok(after.lastSeenAt > before.lastSeenAt);
});

test('modification d\'un hashField → delta updated avec before/after et changedFields', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  invoices[0].state = 'posted';
  const s = await collectConnector(connector);
  assert.equal(s.deltas, 1);
  const d = await RadarDelta.findOne({ connectorId: connector._id, type: 'updated' }).lean();
  assert.equal(d.entityKey, '101');
  assert.equal(d.before.state, 'draft');
  assert.equal(d.after.state, 'posted');
  assert.deepEqual(d.changedFields, ['state']);
  assert.equal(d.status, 'pending');
  const snap = await RadarSnapshot.findOne({ connectorId: connector._id, entityKey: '101' }).lean();
  assert.equal(snap.data.state, 'posted');
  assert.ok(snap.lastChangedAt);
});

test('champ hors hashFields modifié → aucun delta (bruit ignoré)', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  invoices[0].partner = 'ABC Renamed';
  const s = await collectConnector(connector);
  assert.equal(s.deltas, 0);
});

test('nouvelle entité → delta created avec after', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  invoices.push({ id: 103, state: 'draft', amount_total: 980, partner: 'Nouveau' });
  const s = await collectConnector(connector);
  assert.equal(s.deltas, 1);
  const d = await RadarDelta.findOne({ connectorId: connector._id, type: 'created' }).lean();
  assert.equal(d.entityKey, '103');
  assert.equal(d.after.amount_total, 980);
  assert.equal(d.before, undefined);
});

test('entité disparue (detectDeletions) → delta deleted + soft-delete du snapshot', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  invoices = invoices.filter(i => i.id !== 102);
  const s = await collectConnector(connector);
  assert.equal(s.deltas, 1);
  const d = await RadarDelta.findOne({ connectorId: connector._id, type: 'deleted' }).lean();
  assert.equal(d.entityKey, '102');
  assert.equal(d.before.partner, 'Schneider');
  const snap = await RadarSnapshot.findOne({ connectorId: connector._id, entityKey: '102' }).lean();
  assert.ok(snap.deletedAt, 'snapshot soft-deleted, pas détruit');
});

test('entité réapparue → delta created + deletedAt levé', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  invoices.push({ id: 102, state: 'posted', amount_total: 2542, partner: 'Schneider' });
  const s = await collectConnector(connector);
  assert.equal(s.deltas, 1);
  const snap = await RadarSnapshot.findOne({ connectorId: connector._id, entityKey: '102' }).lean();
  assert.equal(snap.deletedAt, null);
});

test('handler en erreur → connecteur error, consecutiveErrors++, puis récupération', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  handlerShouldThrow = true;
  const s = await collectConnector(connector);
  assert.equal(s.ok, false);
  assert.equal(connector.status, 'error');
  assert.equal(connector.health.consecutiveErrors, 1);
  assert.match(connector.lastError, /boom_provider_down/);
  // récupération
  handlerShouldThrow = false;
  const s2 = await collectConnector(connector);
  assert.equal(s2.ok, true);
  assert.equal(connector.status, 'active');
  assert.equal(connector.health.consecutiveErrors, 0);
});

test('scheduler : collecte les connecteurs dus, claim + libération du verrou', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  // Rendre le connecteur dû
  await RadarConnector.updateOne({ _id: connector._id }, { $set: { lastPollAt: new Date(Date.now() - 10 * 60_000), lockedUntil: null } });
  invoices[0].amount_total = 1300;
  const stats = await runSchedulerPass();
  assert.equal(stats.collected, 1);
  assert.equal(stats.errors, 0);
  const fresh = await RadarConnector.findById(connector._id).lean();
  assert.equal(fresh.lockedUntil, null, 'verrou libéré après collecte');
  assert.ok(new Date(fresh.lastPollAt) > new Date(Date.now() - 5000));
  assert.equal(await RadarDelta.countDocuments({ connectorId: connector._id, type: 'updated', 'after.amount_total': 1300 }), 1);
});

test('scheduler : un connecteur verrouillé par une autre instance est ignoré', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  await RadarConnector.updateOne({ _id: connector._id }, { $set: { lastPollAt: new Date(Date.now() - 10 * 60_000), lockedUntil: new Date(Date.now() + 60_000) } });
  const stats = await runSchedulerPass();
  assert.equal(stats.collected, 0, 'connecteur verrouillé non collecté');
  await RadarConnector.updateOne({ _id: connector._id }, { $set: { lockedUntil: null } });
});

test('scheduler : un connecteur pas encore dû n\'est pas collecté', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  await RadarConnector.updateOne({ _id: connector._id }, { $set: { lastPollAt: new Date() } });
  const stats = await runSchedulerPass();
  assert.equal(stats.collected, 0);
});
