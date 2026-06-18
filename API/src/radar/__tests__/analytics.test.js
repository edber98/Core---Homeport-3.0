// Moteur d'analyse (cerveau) : matching flou (fautes de frappe), anomalies de
// corrélation, retards, financier. A (pur) + B (Mongo).

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { nameSimilarity, findCorrelationAnomalies, financialSummary, findStockRisks } = require('../analytics');

// ── A. Matching flou (pur) ──

test('nameSimilarity : tolère les fautes de frappe (le déterministe rattrape les cas clairs)', () => {
  assert.ok(nameSimilarity('Cartonage Chateau', 'Cartonnage du Château') >= 0.6, 'typo rattrapée');
  assert.ok(nameSimilarity('Joly Formation', 'Joly Formations') >= 0.6, 'pluriel');
  assert.ok(nameSimilarity('Facture EDF', 'Cartonnage du Château') < 0.3, 'non lié');
  // « ITBS » vs « IT-BS » : le déterministe seul ne suffit pas → c'est le cas qui
  // justifie l'arbitrage LLM (predict-or-ask). On documente que c'est faible.
  assert.ok(nameSimilarity('ITBS', 'IT-BS') < 0.5, 'cas ambigu → LLM');
});

// ── B. Mongo ──

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_analytics_test';
let mongoUp = true, RadarEntity, RadarRelation, wsId;

test.before(async () => {
  try { await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 }); await mongoose.connection.db.dropDatabase(); }
  catch { mongoUp = false; return; }
  RadarEntity = require('../../db/models/radar-entity.model');
  RadarRelation = require('../../db/models/radar-relation.model');
  wsId = new mongoose.Types.ObjectId();
  // un client + un dossier mal nommé non rattaché + 2 factures (1 payée, 1 impayée)
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Party', subtype: 'organization', canonicalKey: 'email:c@chateau.fr', label: 'Cartonnage du Château', roles: ['client'] });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Asset', subtype: 'folder', canonicalKey: 'nc:folder:/Divers/Cartonage Chateau', label: 'Cartonage Chateau' });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Transaction', subtype: 'invoice', canonicalKey: 'd:inv:1', label: 'F1', attributes: { amount_total: '1000', state: 'payée', payment_state: 'payée' } });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Transaction', subtype: 'invoice', canonicalKey: 'd:inv:2', label: 'F2', attributes: { amount_total: '500', state: 'émise', payment_state: 'impayée' } });
});

test.after(async () => { if (!mongoUp) return; await mongoose.connection.db.dropDatabase(); await mongoose.disconnect(); });

test('findCorrelationAnomalies : dossier mal nommé → near_miss avec suggestion', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const an = await findCorrelationAnomalies(wsId);
  const nm = an.find(a => a.kind === 'near_miss');
  assert.ok(nm, 'anomalie near_miss détectée');
  assert.equal(nm.suggestedClient, 'Cartonnage du Château');
  assert.ok(nm.similarity >= 60);
});

test('financialSummary : encaissé vs en attente', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const f = await financialSummary(wsId);
  assert.equal(f.billed, 1500);
  assert.equal(f.paid, 1000);
  assert.equal(f.outstanding, 500);
  assert.equal(f.collectionRate, 67);
});

test('findStockRisks : produit sur-demandé vs stock faible → goulot', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  // NAS : stock 3, demande 8 → rupture (high) ; Switch : stock 25, demande 2 → OK (ignoré) ;
  // Service : pas de stock → ignoré même si demandé.
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Asset', subtype: 'product', canonicalKey: 'd:product:9', label: 'Serveur NAS', attributes: { type: 'produit', stock: '3' }, aliasKeys: ['dolibarr:product:9'] });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Asset', subtype: 'product', canonicalKey: 'd:product:11', label: 'Switch', attributes: { type: 'produit', stock: '25' } });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Asset', subtype: 'product', canonicalKey: 'd:product:5', label: 'Conseil', attributes: { type: 'service', stock: '0' } });
  const mk = (from, to, qty) => RadarRelation.create({ workspaceId: wsId, fromKey: from, toKey: to, type: 'references', role: 'line_item', evidence: { qty }, confidence: 1, source: 'rule' });
  await mk('d:inv:a', 'dolibarr:product:9', 5); await mk('d:inv:b', 'dolibarr:product:9', 3);   // demande NAS = 8 (via aliasKey, 2 factures)
  await mk('d:inv:a', 'd:product:11', 2);                                 // demande Switch = 2
  await mk('d:inv:a', 'd:product:5', 4);                                  // service demandé mais pas de stock

  const risks = await findStockRisks(wsId);
  const nas = risks.find(r => r.entityKey === 'd:product:9');
  assert.ok(nas, 'NAS en risque de rupture');
  assert.equal(nas.demand, 8);
  assert.equal(nas.severity, 'high');                       // couverture 3/8 < 0.5
  assert.ok(!risks.some(r => r.entityKey === 'd:product:11'), 'Switch couvert → pas de risque');
  assert.ok(!risks.some(r => r.entityKey === 'd:product:5'), 'service → pas de stock à surveiller');
});
