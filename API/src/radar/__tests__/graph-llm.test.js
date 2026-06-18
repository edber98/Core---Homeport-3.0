// Test LLM RÉEL de l'adaptateur appris : le LLM lit de vrais enregistrements
// Dolibarr (fetch live) et infère un RadarMapping vers l'ontologie. On vérifie
// que le mapping est valide, cible le bon type, et s'applique correctement.
// Sauté sans ANTHROPIC_API_KEY ou sans Dolibarr/Mongo.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const path = require('path');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/';
const DB = process.env.MONGO_DB_NAME || 'homeport';

let ready = !!API_KEY;
let skipReason = API_KEY ? null : 'ANTHROPIC_API_KEY absente';
let opts, registry, inferMapping, applyMapping;

async function fetchSamples(listKey, args = { limit: 4 }) {
  const fn = registry.resolve(listKey);
  if (!fn) return [];
  const r = await fn({ id: 't', model: {} }, { payload: {} }, args, opts);
  if (!r.ok) return [];
  const arr = Array.isArray(r.data) ? r.data : Object.values(r).find(v => Array.isArray(v));
  return arr || [];
}

test.before(async () => {
  if (!ready) return;
  try {
    await mongoose.connect(MONGO_URL + DB, { serverSelectionTimeoutMS: 2500 });
  } catch { ready = false; skipReason = 'MongoDB injoignable'; return; }
  const Credential = require('../../db/models/credential.model');
  const { decrypt } = require('../../utils/enc');
  ({ registry } = require('../../plugins/registry'));
  await registry.loadFromDir(path.resolve(__dirname, '../../plugins/repos'), null);
  const cred = await Credential.findOne({ providerKey: 'dolibarr' }).lean();
  if (!cred) { ready = false; skipReason = 'pas de credential dolibarr'; return; }
  opts = { credentials: decrypt(cred.secret), log: () => {} };
  ({ inferMapping } = require('../graph/learn-mapping'));
  ({ applyMapping } = require('../graph/mapping'));
});

test.after(async () => {
  if (mongoose.connection.readyState === 1) await mongoose.disconnect();
});

test('LLM infère un mapping correct pour les TIERS Dolibarr', { timeout: 120_000 }, async (t) => {
  if (!ready) return t.skip(skipReason);
  const samples = await fetchSamples('dolibarr_thirdparties_list');
  if (!samples.length) return t.skip('aucun tiers Dolibarr');
  const res = await inferMapping({ providerKey: 'dolibarr', rawEntityType: 'party', samples });
  assert.ok(res, 'mapping inféré');
  assert.equal(res.valid, true, `mapping invalide: ${res.errors.join(', ')}`);
  // Le LLM doit reconnaître un acteur/organisation
  assert.equal(res.mapping.target.coreType, 'Party', `coreType=${res.mapping.target.coreType}`);
  assert.ok(res.mapping.keyField, 'keyField requis');
  // Le mapping appris s'applique réellement aux échantillons
  const m = applyMapping(samples[0], res.mapping);
  assert.ok(m && m.coreType === 'Party', 'mapping appris applicable');
  assert.ok(m.label && m.label.length > 0, 'label extrait');
  console.log(`[test] tiers → ${res.mapping.target.coreType}/${res.mapping.target.subtype}, key=${res.mapping.keyField}, identity=${JSON.stringify(res.mapping.identityFields)}, label="${m.label}"`);
});

test('LLM infère un mapping transactionnel + la relation vers le tiers (devis)', { timeout: 120_000 }, async (t) => {
  if (!ready) return t.skip(skipReason);
  const samples = await fetchSamples('dolibarr_proposals_list');
  if (!samples.length) return t.skip('aucun devis Dolibarr');
  const res = await inferMapping({ providerKey: 'dolibarr', rawEntityType: 'quote', samples });
  assert.ok(res && res.mapping);
  // Un devis est une Transaction (quote/order)
  assert.equal(res.mapping.target.coreType, 'Transaction', `coreType=${res.mapping.target.coreType}`);
  assert.ok(res.valid, `mapping invalide: ${res.errors.join(', ')}`);
  // Le LLM doit inférer AU MOINS une relation vers une Party (le tiers/contact lié) —
  // le champ exact (socid/contact_id) dépend de ce qui est rempli dans l'échantillon.
  const partyRel = (res.mapping.relationRules || []).find(r => r.targetCoreType === 'Party');
  assert.ok(partyRel, 'le LLM doit inférer au moins une relation vers une Party');
  console.log(`[test] devis → ${res.mapping.target.subtype}, ${res.mapping.relationRules.length} relation(s), dont ${partyRel.type}/${partyRel.role} via ${partyRel.viaField} → Party`);
});

test('robustesse : un mapping LLM invalide est marqué non-valide (pas appliqué)', { timeout: 120_000 }, async (t) => {
  if (!ready) return t.skip(skipReason);
  // Injection d'un faux LLM renvoyant un type hors ontologie → doit être rejeté
  const fake = async () => ({ target: { coreType: 'Licorne', subtype: 'magique' }, keyField: 'id', fieldMap: {} });
  const res = await inferMapping({ providerKey: 'x', rawEntityType: 'y', samples: [{ id: 1 }], complete: fake });
  assert.equal(res.valid, false);
  assert.ok(res.errors.some(e => /type invalide/.test(e)));
  assert.equal(res.mapping.status, 'draft'); // pas activé
});
