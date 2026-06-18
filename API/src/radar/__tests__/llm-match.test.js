// Arbitrage LLM de la zone grise (predict-or-ask) : un doublon que la règle ne
// tranche pas (« Dupont SARL » vs « Sté Dupont ») est confirmé par le LLM (stub).

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { areSameEntity } = require('../learning/llm-match');

test('areSameEntity : le LLM (stub) juge l\'identité', async () => {
  const same = await areSameEntity({ label: 'Dupont SARL', coreType: 'Party' }, { label: 'Sté Dupont', coreType: 'Party' },
    async () => ({ same: true, confidence: 0.9, reason: 'même société, forme juridique différente' }));
  assert.equal(same.same, true);
  const diff = await areSameEntity({ label: 'Facture 12', coreType: 'Transaction' }, { label: 'Facture 99', coreType: 'Transaction' },
    async () => ({ same: false, confidence: 0.95, reason: 'numéros différents' }));
  assert.equal(diff.same, false);
});

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_llmmatch_test';
let mongoUp = true, wsId;
test.before(async () => {
  try { await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 }); await mongoose.connection.db.dropDatabase(); }
  catch { mongoUp = false; return; }
  wsId = new mongoose.Types.ObjectId();
});
test.after(async () => { if (!mongoUp) return; await mongoose.connection.db.dropDatabase(); await mongoose.disconnect(); });

test('findDuplicates : zone grise tranchée par le LLM (verified=llm)', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const RadarEntity = require('../../db/models/radar-entity.model');
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Party', subtype: 'organization', canonicalKey: 'a', label: 'Dupont SARL', sources: [{ providerKey: 'dolibarr' }] });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Party', subtype: 'organization', canonicalKey: 'b', label: 'Sté Dupont', sources: [{ providerKey: 'hubspot' }] });
  const { findDuplicates } = require('../duplicates');
  // sans LLM : zone grise non flagguée
  const noLLM = await findDuplicates(wsId, { useLLM: false });
  // avec LLM stubbé : flaggué via LLM
  const withLLM = await findDuplicates(wsId, { useLLM: true, complete: async () => ({ same: true, confidence: 0.9, reason: 'même société (forme juridique différente)' }) });
  assert.ok(withLLM.length >= 1, 'doublon de zone grise détecté via LLM');
  assert.equal(withLLM[0].verified, 'llm');
  assert.ok(withLLM.length > noLLM.length || noLLM.length === 0, 'le LLM ajoute des cas que la règle rate');
});
