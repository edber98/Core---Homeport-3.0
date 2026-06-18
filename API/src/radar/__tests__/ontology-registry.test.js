// P0 — Registre d'ontologie : cohérence du seed avec ontology.js (pur) +
// idempotence de seedOntologyTypes en Mongo (sauté si Mongo injoignable).

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const ont = require('../graph/ontology');
const { buildOntologyRows, seedOntologyTypes } = require('../graph/ontology-seed');

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_ontology_test';

// ── Cohérence pure ──

test('buildOntologyRows : une ligne par (coreType, subtype) de ontology.js', () => {
  const rows = buildOntologyRows();
  const expected = ont.CORE_TYPE_KEYS.reduce((n, k) => n + ont.CORE_TYPES[k].subtypes.length, 0);
  assert.equal(rows.length, expected, `attendu ${expected} lignes`);
  assert.ok(expected >= 40, `au moins ~40 sous-types attendus, eu ${expected}`);
});

test('chaque ligne cible un type valide et a une clé unique', () => {
  const rows = buildOntologyRows();
  const keys = new Set();
  for (const r of rows) {
    assert.ok(ont.isValidType(r.coreType, r.subtype), `${r.coreType}.${r.subtype} invalide`);
    assert.equal(r.key, `${r.coreType}.${r.subtype}`.toLowerCase());
    assert.ok(!keys.has(r.key), `clé dupliquée: ${r.key}`);
    keys.add(r.key);
  }
});

test('les champs canoniques connus sont propagés depuis ontology.js', () => {
  const rows = buildOntologyRows();
  const invoice = rows.find(r => r.key === 'transaction.invoice');
  assert.ok(invoice, 'transaction.invoice présent');
  const names = invoice.canonicalFields.map(f => f.name);
  assert.ok(names.includes('number') && names.includes('amount_total') && names.includes('state'),
    `champs facture incomplets: ${names.join(',')}`);
});

test('un libellé FR et une catégorie sont posés sur les sous-types métier', () => {
  const rows = buildOntologyRows();
  const invoice = rows.find(r => r.key === 'transaction.invoice');
  assert.equal(invoice.label, 'Facture');
  assert.equal(invoice.category, 'accounting');
  // tous les libellés non vides
  for (const r of rows) assert.ok(r.label && r.label.length > 0, `libellé manquant: ${r.key}`);
});

// ── Idempotence en base ──

let mongoUp = true;
test.before(async () => {
  try {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
    await mongoose.connection.db.dropDatabase();
  } catch { mongoUp = false; }
});
test.after(async () => {
  if (!mongoUp) return;
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

test('seedOntologyTypes : idempotent (deux passes → même nombre de docs)', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const RadarOntologyType = require('../../db/models/radar-ontology-type.model');
  const n1 = await seedOntologyTypes();
  const count1 = await RadarOntologyType.countDocuments({ workspaceId: null });
  assert.equal(count1, n1, 'tous les types insérés');
  await seedOntologyTypes(); // 2e passe
  const count2 = await RadarOntologyType.countDocuments({ workspaceId: null });
  assert.equal(count2, count1, 'aucun doublon après re-seed');
});
