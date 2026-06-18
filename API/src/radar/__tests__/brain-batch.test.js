// Batch cerveau : séries temporelles (R5), kNN (R4.4), capteurs (R5.1),
// doublons/double-saisie (R4.2), dérive de schéma (R3.1).

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const ts = require('../learning/timeseries');
const knn = require('../learning/knn');

// ── Séries temporelles (pur) ──
test('timeseries : tendance + direction + anomalie', () => {
  const up = [10, 11, 12, 13, 14, 15].map((v, i) => ({ at: i, value: v }));
  const a = ts.analyzeSeries(up);
  assert.ok(a.trend.slope > 0 && a.direction === 'hausse');
  // sur peu de points le z d'un outlier plafonne à √(n-1) ; on prend ≥10 points
  const spike = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 100].map((v, i) => ({ at: i, value: v }));
  assert.ok(ts.analyzeSeries(spike).anomalies.length >= 1, 'pic détecté');
});

// ── kNN (pur) ──
test('knn : featurize + prédiction du bon label, null si incertain', () => {
  const ex = [
    { vec: knn.featurize('facture EDF montant énergie'), label: 'significant' },
    { vec: knn.featurize('facture SFR montant telecom'), label: 'significant' },
    { vec: knn.featurize('newsletter promo soldes désabonner'), label: 'noise' },
    { vec: knn.featurize('newsletter actualités hebdo désabonner'), label: 'noise' },
  ];
  assert.equal(knn.knnPredict(ex, knn.featurize('facture ENGIE énergie montant'), { k: 3 })?.label, 'significant');
  assert.equal(knn.knnPredict(ex, knn.featurize('newsletter promo désabonner'), { k: 3 })?.label, 'noise');
  assert.equal(knn.knnPredict(ex, knn.featurize('xyzqwerty zzz'), { k: 3 }), null, 'incertain → null (fallback LLM)');
});

// ── Mongo : capteurs, doublons, dérive ──
const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_brain_test';
let mongoUp = true, wsId;
test.before(async () => {
  try { await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 }); await mongoose.connection.db.dropDatabase(); }
  catch { mongoUp = false; return; }
  wsId = new mongoose.Types.ObjectId();
});
test.after(async () => { if (!mongoUp) return; await mongoose.connection.db.dropDatabase(); await mongoose.disconnect(); });

test('sensors : série capteur avec pic → alerte anomalie', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const { recordMeasurement, analyzeSensors } = require('../sensors');
  const base = Date.now() - 10 * 3600000;
  for (let i = 0; i < 8; i++) await recordMeasurement(wsId, { assetKey: 'dolibarr:machine:M3', metric: 'temperature', value: i === 6 ? 95 : 70 + (i % 2), unit: '°C', at: new Date(base + i * 3600000) });
  const res = await analyzeSensors(wsId);
  const m3 = res.find(r => r.assetKey === 'dolibarr:machine:M3' && r.metric === 'temperature');
  assert.ok(m3, 'série analysée');
  assert.ok(m3.alert && m3.alert.kind === 'anomaly', 'anomalie capteur détectée');
});

test('duplicates : double-saisie cross-système détectée (ITBS / IT-BS)', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const RadarEntity = require('../../db/models/radar-entity.model');
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Party', subtype: 'organization', canonicalKey: 'email:c@itbs.fr', label: 'ITBS Solutions', sources: [{ providerKey: 'dolibarr' }] });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Party', subtype: 'organization', canonicalKey: 'crm:party:42', label: 'ITBS Solution', sources: [{ providerKey: 'hubspot' }] });
  const { findDuplicates } = require('../duplicates');
  const dups = await findDuplicates(wsId, { threshold: 0.6 });
  assert.ok(dups.length >= 1, 'doublon détecté');
  assert.equal(dups[0].crossSystem, true, 'systèmes différents → double-saisie');
});

test('drift : un schéma source qui change est détecté', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const RadarMapping = require('../../db/models/radar-mapping.model');
  const RadarSnapshot = require('../../db/models/radar-snapshot.model');
  const { schemaChecksum } = require('../graph/mapping');
  const conn = new mongoose.Types.ObjectId();
  // mapping avec un checksum d'un ancien schéma {ref,total}
  await RadarMapping.create({ providerKey: 'acme', rawEntityType: 'inv', target: { coreType: 'Transaction', subtype: 'invoice' }, keyField: 'id', checksum: schemaChecksum({ id: 1, ref: 'x', total: 2 }), status: 'active' });
  // snapshot récent avec un schéma DIFFÉRENT (champ ajouté)
  await RadarSnapshot.create({ workspaceId: wsId, connectorId: conn, family: 'accounting', entityType: 'inv', entityKey: '1', contentHash: 'h', data: { id: 1, ref: 'x', total: 2, nouveau_champ: 9 }, firstSeenAt: new Date(), lastSeenAt: new Date() });
  const { detectDrift } = require('../graph/drift');
  const drifts = await detectDrift(wsId);
  assert.ok(drifts.find(d => d.rawEntityType === 'inv'), 'dérive de schéma détectée');
});
