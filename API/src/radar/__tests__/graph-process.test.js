// PM — Process mining (Celonis) : depuis les deltas (cycle de vie), reconstruire
// le directly-follows graph, les variantes et les durées. A (pur) + B (Mongo).

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { buildTimelines, mineGroup, mineProcesses, stateFieldOf } = require('../process/miner');

const INVOICE_MAPPING = {
  rawEntityType: 'customer_invoice', target: { coreType: 'Transaction', subtype: 'invoice' },
  fieldMap: { state: 'statut' }, valueMap: { state: { '0': 'brouillon', '1': 'émise', '2': 'payée', '3': 'annulée' } },
};

function delta(entityKey, type, statut, atISO) {
  return { entityType: 'customer_invoice', entityKey, type, after: statut != null ? { statut } : undefined, occurredAt: atISO };
}

// ── A. Pur ──

test('PM — stateFieldOf : trouve le champ d\'état et son valueMap', () => {
  const sf = stateFieldOf(INVOICE_MAPPING);
  assert.equal(sf.canonField, 'state');
  assert.equal(sf.rawField, 'statut');
  assert.equal(sf.valueMap['2'], 'payée');
});

test('PM — buildTimelines : reconstruit le cycle de vie, libellés via valueMap', () => {
  const deltas = [
    delta('14', 'created', '0', '2026-05-01T10:00:00Z'),
    delta('14', 'updated', '1', '2026-05-03T10:00:00Z'),
    delta('14', 'updated', '1', '2026-05-03T12:00:00Z'), // doublon → collapse
    delta('14', 'updated', '2', '2026-05-10T10:00:00Z'),
  ];
  const tl = buildTimelines(deltas, INVOICE_MAPPING);
  const seq = tl.get('14').map(s => s.state);
  assert.deepEqual(seq, ['brouillon', 'émise', 'payée']);
});

test('PM — mineGroup : DFG + variantes + durées', () => {
  const deltas = [
    delta('14', 'created', '0', '2026-05-01T00:00:00Z'),
    delta('14', 'updated', '1', '2026-05-03T00:00:00Z'),
    delta('14', 'updated', '2', '2026-05-13T00:00:00Z'),
    delta('15', 'created', '0', '2026-05-01T00:00:00Z'),
    delta('15', 'updated', '3', '2026-05-02T00:00:00Z'),
  ];
  const tl = buildTimelines(deltas, INVOICE_MAPPING);
  const g = mineGroup(tl);
  assert.equal(g.entityCount, 2);
  // transitions attendues
  const t = (from, to) => g.transitions.find(x => x.from === from && x.to === to);
  assert.ok(t('brouillon', 'émise'), 'brouillon→émise');
  assert.ok(t('émise', 'payée'), 'émise→payée');
  assert.ok(t('brouillon', 'annulée'), 'brouillon→annulée');
  // durée brouillon→émise = 2 jours
  assert.equal(t('brouillon', 'émise').avgDurationMs, 2 * 86400000);
  // variantes
  const variants = g.variants.map(v => v.sequence);
  assert.ok(variants.includes('brouillon → émise → payée'));
  assert.ok(variants.includes('brouillon → annulée'));
});

// ── B. Mongo (mineProcesses end-to-end) ──

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_process_test';
let mongoUp = true;
let RadarDelta, seedDolibarrMappings, wsId;

test.before(async () => {
  try {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
    await mongoose.connection.db.dropDatabase();
  } catch { mongoUp = false; return; }
  RadarDelta = require('../../db/models/radar-delta.model');
  ({ seedDolibarrMappings } = require('../graph/mappings-dolibarr'));
  await seedDolibarrMappings();
  wsId = new mongoose.Types.ObjectId();
  const mk = (entityKey, type, statut, at) => ({
    workspaceId: wsId, connectorId: new mongoose.Types.ObjectId(), family: 'accounting',
    entityType: 'customer_invoice', entityKey, type, after: { statut }, occurredAt: at, status: 'consumed',
  });
  await RadarDelta.insertMany([
    mk('14', 'created', '0', new Date('2026-05-01')), mk('14', 'updated', '1', new Date('2026-05-04')), mk('14', 'updated', '2', new Date('2026-05-14')),
    mk('15', 'created', '0', new Date('2026-05-01')), mk('15', 'updated', '1', new Date('2026-05-06')), mk('15', 'updated', '2', new Date('2026-05-20')),
    mk('16', 'created', '0', new Date('2026-05-02')), mk('16', 'updated', '3', new Date('2026-05-03')),
  ]);
});

test.after(async () => {
  if (!mongoUp) return;
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

test('PM — mineProcesses : découvre le processus Facture depuis la base', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const procs = await mineProcesses(wsId);
  const invoice = procs.find(p => p.coreType === 'Transaction' && p.subtype === 'invoice');
  assert.ok(invoice, 'processus Facture découvert');
  assert.equal(invoice.entityCount, 3);
  // le mapping seedé utilise les libellés FR brouillon/émise/payée/annulée
  assert.equal(invoice.variants[0].sequence, 'brouillon → émise → payée');
  assert.equal(invoice.variants[0].count, 2);
  const be = invoice.transitions.find(x => x.from === 'brouillon' && x.to === 'émise');
  assert.equal(be.count, 2);
  console.log(`[test] Facture : ${invoice.entityCount} entités, variantes=${invoice.variants.map(v => v.sequence + ' (' + v.count + ')').join(' | ')}`);
});
