// Connecteur BD intelligent : scanne les collections d'une base SAP-like, déduit
// la catégorie de chacune (OF→WorkItem, machine→Asset, capteur→Measurement), et
// marque en brouillon (à confirmer) celles dont il doute. Sauté si Mongo injoignable.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { scanDatabase } = require('../graph/learn-db');

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_learndb_test';
let mongoUp = true, RadarMapping, wsId;

// Base SAP-like simulée (dans la BD, pas un connecteur simulé) : ce que le DB
// connector lirait. OF avec statut de fabrication + retours capteurs.
const DB = {
  production_orders: [
    { id: 'OF-1', of_number: 'OF-2026-001', product: 'Carton A', qty: 500, status: 'in_production', machine: 'M3' },
    { id: 'OF-2', of_number: 'OF-2026-002', product: 'Carton B', qty: 200, status: 'done', machine: 'M1' },
  ],
  machines: [{ id: 'M1', name: 'Presse 1', status: 'running' }, { id: 'M3', name: 'Découpe 3', status: 'stopped' }],
  sensor_readings: [{ id: 's1', machine: 'M3', metric: 'temperature', value: 78.5, at: '2026-06-17T10:00:00Z' }],
  _logs: [{ id: 'l1', ts: 1, msg: 'boot' }],   // collection ambiguë → doute → brouillon
};

const execStub = async ({ capability, args }) => {
  if (capability === 'listCollections') return { ok: true, result: { collections: Object.keys(DB) } };
  if (capability === 'queryCollection') return { ok: true, result: { data: DB[args.collection] || [] } };
  return { ok: false, error: 'unknown' };
};
const llmStub = async (prompt) => {
  if (prompt.includes('production_orders')) return { target: { coreType: 'WorkItem', subtype: 'work_order' }, keyField: 'id', labelField: 'of_number', fieldMap: { number: 'of_number', status: 'status', quantity: 'qty' }, relationRules: [{ type: 'references', viaField: 'machine', targetCoreType: 'Asset', targetSubtype: 'machine' }] };
  if (prompt.includes('machines')) return { target: { coreType: 'Asset', subtype: 'machine' }, keyField: 'id', labelField: 'name', fieldMap: { name: 'name', status: 'status' } };
  if (prompt.includes('sensor_readings')) return { target: { coreType: 'Measurement', subtype: 'temperature' }, keyField: 'id', fieldMap: { value: 'value' } };
  return { target: { coreType: 'Licorne', subtype: 'x' }, keyField: 'id', fieldMap: {} }; // hors ontologie → doute
};

test.before(async () => {
  try { await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 }); await mongoose.connection.db.dropDatabase(); }
  catch { mongoUp = false; return; }
  RadarMapping = require('../../db/models/radar-mapping.model');
  wsId = new mongoose.Types.ObjectId();
});
test.after(async () => { if (!mongoUp) return; await mongoose.connection.db.dropDatabase(); await mongoose.disconnect(); });

test('scanDatabase : catégorise les collections + brouillon si doute', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const out = await scanDatabase({ workspaceId: wsId, providerKey: 'sap_mongo', family: 'database' }, { execCapability: execStub, complete: llmStub });
  assert.equal(out.collections, 4);
  const by = Object.fromEntries(out.proposals.map(p => [p.collection, p]));
  assert.equal(by.production_orders.target.coreType, 'WorkItem');
  assert.equal(by.production_orders.status, 'active');
  assert.equal(by.machines.target.coreType, 'Asset');
  assert.equal(by.sensor_readings.target.coreType, 'Measurement');
  // collection ambiguë → mapping hors ontologie → brouillon à confirmer
  assert.equal(by._logs.status, 'draft');
  assert.equal(by._logs.needsConfirmation, true);
  // les mappings valides sont sauvegardés actifs
  const m = await RadarMapping.findOne({ providerKey: 'sap_mongo', rawEntityType: 'production_orders' }).lean();
  assert.ok(m && m.status === 'active' && m.target.coreType === 'WorkItem');
  console.log(`[test] DB scan : ${out.proposals.map(p => p.collection + '→' + (p.target ? p.target.coreType : p.status)).join(', ')}`);
});
