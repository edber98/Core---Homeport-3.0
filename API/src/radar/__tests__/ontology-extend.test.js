// Ontologie DYNAMIQUE : le LLM peut créer un sous-type métier (centre de formation,
// expert-comptable…) sous un coreType universel → accepté + enregistré au registre.
// Un coreType hors squelette (9) reste rejeté. Sauté si Mongo injoignable.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { inferMapping } = require('../graph/learn-mapping');
const { isValidCoreType } = require('../graph/ontology');

test('isValidCoreType : squelette fermé de 9 coreTypes', () => {
  assert.ok(isValidCoreType('Event') && isValidCoreType('Measurement'));
  assert.ok(!isValidCoreType('Licorne'));
});

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_ontoext_test';
let mongoUp = true, RadarOntologyType, wsId;

test.before(async () => {
  try { await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 }); await mongoose.connection.db.dropDatabase(); }
  catch { mongoUp = false; return; }
  RadarOntologyType = require('../../db/models/radar-ontology-type.model');
});
test.after(async () => { if (!mongoUp) return; await mongoose.connection.db.dropDatabase(); await mongoose.disconnect(); });

test('inferMapping : crée un sous-type métier « session de formation » et l\'enregistre', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  // Échantillons Digiforma-like ; LLM stubbé propose Event/formation_session (nouveau)
  const samples = [{ id: 'S1', titre: 'Formation Sécurité', debut: '2026-09-01', stagiaires: 12 }];
  const complete = async () => ({ target: { coreType: 'Event', subtype: 'formation_session' }, keyField: 'id', labelField: 'titre', fieldMap: { title: 'titre', start: 'debut' } });
  const res = await inferMapping({ providerKey: 'digiforma', rawEntityType: 'session', samples, complete });
  assert.equal(res.valid, true, (res.errors || []).join(', '));
  assert.equal(res.newSubtype, true, 'nouveau sous-type détecté');
  // enregistré au registre d'ontologie
  const t2 = await RadarOntologyType.findOne({ key: 'event.formation_session' }).lean();
  assert.ok(t2, 'sous-type ajouté au registre');
  assert.equal(t2.source, 'llm');
});

test('inferMapping : un coreType hors squelette est rejeté (brouillon)', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const res = await inferMapping({ providerKey: 'x', rawEntityType: 'y', samples: [{ id: 1 }], complete: async () => ({ target: { coreType: 'Licorne', subtype: 'magique' }, keyField: 'id' }) });
  assert.equal(res.valid, false);
  assert.ok(res.errors.some(e => /coreType invalide/.test(e)));
});
