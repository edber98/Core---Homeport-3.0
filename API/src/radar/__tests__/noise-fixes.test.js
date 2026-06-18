// Tests des correctifs anti-bruit :
//  - excludeWhen sur les specs watch (ex: dossiers Nextcloud sans contentType) ;
//  - sourdine de signifiance : un signal identique ÉCARTÉ par le superviseur
//    il y a moins de 24 h ne le re-réveille pas (économie de crédits) ;
//  - le manifest email smtp_imap a un watch (lecture IMAP réelle observée).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const { matchesExclude } = require('../collector');

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_radar_noise_test';
let mongoUp = true;
let wsId;

test.before(async () => {
  try {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
    await mongoose.connection.db.dropDatabase();
    const Workspace = require('../../db/models/workspace.model');
    const ws = await Workspace.create({ name: 'Noise Test', companyId: new mongoose.Types.ObjectId() });
    wsId = ws._id;
  } catch { mongoUp = false; }
});

test.after(async () => {
  if (!mongoUp) return;
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

// ── excludeWhen (pur) ──

test('matchesExclude : empty / equals / in, OR entre règles', () => {
  const folder = { name: 'OpenProject', contentType: '', path: '/OpenProject/' };
  const file = { name: 'facture.pdf', contentType: 'application/pdf' };
  const rules = [{ field: 'contentType', empty: true }];
  assert.equal(matchesExclude(folder, rules), true);
  assert.equal(matchesExclude(file, rules), false);
  assert.equal(matchesExclude({ state: 'cancel' }, [{ field: 'state', in: ['cancel', 'draft'] }]), true);
  assert.equal(matchesExclude({ state: 'posted' }, [{ field: 'state', in: ['cancel', 'draft'] }]), false);
  assert.equal(matchesExclude({ kind: 'dir' }, [{ field: 'kind', equals: 'dir' }]), true);
  assert.equal(matchesExclude(file, []), false);
  assert.equal(matchesExclude(file, undefined), false);
  // OR : la 2e règle matche
  assert.equal(matchesExclude(file, [{ field: 'x', empty: true }, { field: 'name', equals: 'facture.pdf' }]), true);
});

test('manifest nextcloud : parcours récursif, watch fichiers ET dossiers séparés', () => {
  const m = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../plugins/repos/nextcloud/manifest.json'), 'utf8'));
  const ncFiles = m.providers.find(p => p.key === 'nextcloudFiles');
  const storage = ncFiles.radar.find(b => b.family === 'storage');
  // capacité branchée sur le parcours récursif borné
  assert.equal(storage.capabilities.listTree.template, 'nc_file_tree');
  // deux watch : fichiers (exclut dossiers) et dossiers (exclut fichiers)
  const fileW = storage.watch.find(w => w.entity === 'file');
  const folderW = storage.watch.find(w => w.entity === 'folder');
  assert.deepEqual(fileW.excludeWhen, [{ field: 'isFolder', equals: true }]);
  assert.deepEqual(folderW.excludeWhen, [{ field: 'isFolder', equals: false }]);
  assert.equal(fileW.itemsField, 'files');
  // le nodeTemplate nc_file_tree doit exister (sinon le bloc radar est rejeté à l'import)
  assert.ok(m.nodeTemplates.some(t => t.key === 'nc_file_tree'), 'nodeTemplate nc_file_tree déclaré');
});

test('manifest email : smtp_imap a un watch sur les messages (hashFields stables)', () => {
  const m = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../plugins/repos/email/manifest.json'), 'utf8'));
  const imap = m.providers.find(p => p.key === 'smtp_imap');
  const block = imap.radar.find(b => b.family === 'email');
  const watch = block.watch.find(w => w.entity === 'email_message');
  assert.equal(watch.via, 'listMessages');
  assert.equal(watch.itemsField, 'messages');
  assert.deepEqual(watch.hashFields, ['subject', 'from'], 'hash stable : pas de bruit sur le flag lu/non-lu');
  assert.equal(block.capabilities.listMessages.template, 'email_read');
});

test('email_read : refuse proprement sans credentials (plus un placeholder vide)', async () => {
  const { registry } = require('../../plugins/registry');
  // charge le handler directement depuis le fichier
  const handlers = require('../../plugins/repos/email/functions/imap.js');
  const out = await handlers.email_read({ id: 'n' }, { payload: {} }, {}, { credentials: {} });
  assert.equal(out.ok, false);
  assert.match(out.error, /missing_imap_credentials/);
  void registry;
});

// ── Sourdine de signifiance (DB) ──

test('signifiance : un signal identique écarté < 24 h est mis en sourdine', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const RadarDelta = require('../../db/models/radar-delta.model');
  const RadarSignal = require('../../db/models/radar-signal.model');
  const { runSignificancePass } = require('../significance');
  const { newId } = require('../../utils/ids');

  const mkDelta = () => ({
    id: newId('rdel'), workspaceId: wsId, connectorId: new mongoose.Types.ObjectId(),
    family: 'storage', entityType: 'file', entityKey: '/OpenProject/',
    type: 'updated', before: { etag: 'a' }, after: { etag: 'b' },
    status: 'pending', occurredAt: new Date(),
  });

  // 1er passage : signal créé avec dedupeKey
  await RadarDelta.insertMany([mkDelta()]);
  const s1 = await runSignificancePass({ classify: async () => null });
  assert.equal(s1.signals, 1);
  const sig = await RadarSignal.findOne({ workspaceId: wsId, category: 'storage_change' }).lean();
  assert.ok(sig.dedupeKey, 'les signaux règles portent un dedupeKey');

  // Le superviseur l'écarte
  await RadarSignal.updateOne({ id: sig.id }, { $set: { status: 'dismissed', resolution: 'Bruit de synchro' } });

  // 2e passage avec le MÊME changement → sourdine : pas de nouveau signal, deltas ignorés
  await RadarDelta.insertMany([mkDelta()]);
  const s2 = await runSignificancePass({ classify: async () => null });
  assert.equal(s2.signals, 0);
  assert.equal(s2.muted, 1);
  assert.equal(await RadarSignal.countDocuments({ workspaceId: wsId, category: 'storage_change' }), 1);
  assert.equal(await RadarDelta.countDocuments({ workspaceId: wsId, status: 'pending' }), 0);

  // Mais un signal TRAITÉ (handled) ne met pas en sourdine : les récurrences comptent
  await RadarSignal.updateOne({ id: sig.id }, { $set: { status: 'handled' } });
  await RadarDelta.insertMany([mkDelta()]);
  const s3 = await runSignificancePass({ classify: async () => null });
  assert.equal(s3.signals, 1, 'un signal handled ne coupe pas les occurrences suivantes');
});
