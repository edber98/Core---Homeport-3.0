// Contexte entreprise : interprétation LLM (stubbée) + persistance + needsSetup.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { interpretContext } = require('../context');

test('interpretContext : structure le métier (pur, LLM stubbé)', async () => {
  const complete = async () => ({
    sector: 'Industrie', activities: ['production', 'maintenance', 'facturation'],
    suggestedFamilies: ['industry', 'accounting', 'storage'], keyMetrics: ['OEE', 'trésorerie'],
    summary: 'Usine produisant sur commande, à surveiller : arrêts machine et trésorerie.',
  });
  const r = await interpretContext('On est une usine de cartonnage, production sur commande, beaucoup de maintenance machine.', complete);
  assert.equal(r.sector, 'industrie');               // normalisé en minuscule
  assert.ok(r.suggestedFamilies.includes('industry'));
  assert.ok(r.keyMetrics.includes('OEE'));
  assert.ok(r.summary.length > 0);
});

test('interpretContext : description vide → null', async () => {
  assert.equal(await interpretContext('', async () => ({})), null);
});

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_context_test';
let mongoUp = true, saveContext, getContext, wsId;

test.before(async () => {
  try { await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 }); await mongoose.connection.db.dropDatabase(); }
  catch { mongoUp = false; return; }
  ({ saveContext, getContext } = require('../context'));
  wsId = new mongoose.Types.ObjectId();
});
test.after(async () => { if (!mongoUp) return; await mongoose.connection.db.dropDatabase(); await mongoose.disconnect(); });

test('saveContext / getContext : persiste l\'interprétation', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const complete = async () => ({ sector: 'expert_comptable', activities: ['saisie', 'déclarations'], suggestedFamilies: ['accounting'], keyMetrics: ['CA', 'échéances fiscales'], summary: 'Cabinet comptable.' });
  await saveContext(wsId, 'Cabinet d\'expertise comptable, beaucoup de gestion de chiffre et d\'échéances fiscales.', { complete });
  const ctx = await getContext(wsId);
  assert.equal(ctx.sector, 'expert_comptable');
  assert.equal(ctx.source, 'llm');
  assert.ok(ctx.suggestedFamilies.includes('accounting'));
});
