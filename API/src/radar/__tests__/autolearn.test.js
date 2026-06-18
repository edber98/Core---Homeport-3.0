// Auto-apprentissage des mappings manquants (zéro-hardcode) : un connecteur dont
// un type d'enregistrement n'a pas de mapping → le LLM l'infère et on le sauvegarde.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_autolearn_test';
let mongoUp = true, RadarSnapshot, RadarMapping, autoLearnConnector, wsId, connector;

test.before(async () => {
  try { await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 }); await mongoose.connection.db.dropDatabase(); }
  catch { mongoUp = false; return; }
  RadarSnapshot = require('../../db/models/radar-snapshot.model');
  RadarMapping = require('../../db/models/radar-mapping.model');
  ({ autoLearnConnector } = require('../graph/autolearn'));
  wsId = new mongoose.Types.ObjectId();
  connector = { _id: new mongoose.Types.ObjectId(), workspaceId: wsId, providerKey: 'acme_erp', family: 'accounting' };
  // 2 snapshots d'un type INCONNU (aucun mapping déclaré pour acme_erp)
  for (const d of [{ ref: 'INV-1', montant: '100', etat: 'paid', tiers: 'C1' }, { ref: 'INV-2', montant: '200', etat: 'open', tiers: 'C2' }]) {
    await RadarSnapshot.create({ workspaceId: wsId, connectorId: connector._id, family: 'accounting', entityType: 'acme_invoice', entityKey: d.ref, contentHash: 'h-' + d.ref, data: d, firstSeenAt: new Date(), lastSeenAt: new Date() });
  }
});

test.after(async () => { if (!mongoUp) return; await mongoose.connection.db.dropDatabase(); await mongoose.disconnect(); });

test('autoLearnConnector : apprend et sauvegarde le mapping d\'un type inconnu', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  // LLM stubbé : renvoie un mapping plausible vers l'ontologie
  const complete = async () => ({
    target: { coreType: 'Transaction', subtype: 'invoice' },
    keyField: 'ref', labelField: 'ref',
    fieldMap: { number: 'ref', amount_total: 'montant', state: 'etat' },
    relationRules: [{ type: 'party_of', role: 'billed_to', viaField: 'tiers', targetCoreType: 'Party', targetSubtype: 'organization' }],
  });
  const learned = await autoLearnConnector(connector, { complete });
  assert.equal(learned.length, 1);
  assert.equal(learned[0].rawEntityType, 'acme_invoice');
  assert.equal(learned[0].valid, true);

  // le mapping est en base, actif, et appris par LLM
  const m = await RadarMapping.findOne({ providerKey: 'acme_erp', rawEntityType: 'acme_invoice' }).lean();
  assert.ok(m, 'mapping sauvegardé');
  assert.equal(m.status, 'active');
  assert.equal(m.learnedBy, 'llm');
  assert.equal(m.target.coreType, 'Transaction');

  // idempotent : 2e passage n'apprend rien (déjà mappé)
  const again = await autoLearnConnector(connector, { complete });
  assert.equal(again.length, 0, 'rien à réapprendre');
});
