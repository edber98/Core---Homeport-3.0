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

// ── C. Processus de vente global + segment (I3/I4) ──

test('PM — mineSalesProcess : flux de vente bout-en-bout + segment', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const { mineSalesProcess } = require('../process/sales-process');
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');
  // un client (segment industrie) + ses 2 factures (déjà des deltas 14/15) reliées
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Party', subtype: 'organization', canonicalKey: 'email:c@indus.fr', label: 'Indus SA', roles: ['client'], attributes: { segment: 'industrie' }, firstSeenAt: new Date('2026-05-01'), lastSeenAt: new Date() });
  for (const id of ['14', '15']) {
    await RadarEntity.create({ workspaceId: wsId, coreType: 'Transaction', subtype: 'invoice', canonicalKey: `dolibarr:customer_invoice:${id}`, label: `FA-${id}`, firstSeenAt: new Date('2026-05-01'), lastSeenAt: new Date() });
    await RadarRelation.create({ workspaceId: wsId, fromKey: `dolibarr:customer_invoice:${id}`, toKey: 'email:c@indus.fr', type: 'party_of', role: 'billed_to', confidence: 1, source: 'rule' });
  }
  const sp = await mineSalesProcess(wsId);
  assert.ok(sp.deals >= 1, 'au moins une affaire');
  // étapes issues des vrais états (brouillon/émise/payée) reconstruits depuis les deltas
  assert.ok(sp.stages.some(s => /Facture/.test(s.stage)), 'étapes Facture présentes');
  const seg = sp.bySegment.find(s => s.segment === 'industrie');
  assert.ok(seg && seg.deals >= 1, 'segment industrie comptabilisé');
  // filtre par segment
  const filtered = await mineSalesProcess(wsId, { segment: 'industrie' });
  assert.ok(filtered.deals >= 1, 'filtre segment fonctionne');
  console.log(`[test] Vente : ${sp.deals} affaires, étapes=${sp.stages.map(s => s.stage).join(', ')}`);
});

// ── D. Exécution d'action R4 (fusion de doublon) ──

test('R4 — executeAction : fusionne deux doublons et ré-aiguille les relations', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const { executeAction } = require('../actions');
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Party', subtype: 'organization', canonicalKey: 'p:keep', label: 'ACME', roles: ['client'], firstSeenAt: new Date(), lastSeenAt: new Date() });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Party', subtype: 'organization', canonicalKey: 'p:drop', label: 'ACME SA', roles: ['supplier'], firstSeenAt: new Date(), lastSeenAt: new Date() });
  await RadarRelation.create({ workspaceId: wsId, fromKey: 'x:doc', toKey: 'p:drop', type: 'party_of', role: 'client', confidence: 1, source: 'rule' });
  const r = await executeAction(wsId, { type: 'fusionner', keepKey: 'p:keep', dropKey: 'p:drop' });
  assert.equal(r.ok, true);
  assert.equal(await RadarEntity.countDocuments({ workspaceId: wsId, canonicalKey: 'p:drop' }), 0, 'drop supprimée');
  const kept = await RadarEntity.findOne({ workspaceId: wsId, canonicalKey: 'p:keep' }).lean();
  assert.ok(kept.roles.includes('supplier'), 'rôles fusionnés');
  assert.ok((kept.aliasKeys || []).includes('p:drop'), 'alias conservé');
  const rel = await RadarRelation.findOne({ workspaceId: wsId, fromKey: 'x:doc' }).lean();
  assert.equal(rel.toKey, 'p:keep', 'relation ré-aiguillée vers keep');
});

// ── E. Mapping utilisateurs / charge (qui fait quoi) ──

test('people — workloadStats : charge par personne depuis les affectations', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const { workloadStats } = require('../people');
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');
  await RadarEntity.create({ workspaceId: wsId, coreType: 'Party', subtype: 'person', canonicalKey: 'email:claire@k.fr', label: 'Claire', roles: ['employee'], attributes: { org: 'KINN' }, firstSeenAt: new Date(), lastSeenAt: new Date() });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'WorkItem', subtype: 'task', canonicalKey: 'w:t1', label: 'T1', attributes: { status: 'en cours' }, firstSeenAt: new Date(), lastSeenAt: new Date() });
  await RadarEntity.create({ workspaceId: wsId, coreType: 'WorkItem', subtype: 'task', canonicalKey: 'w:t2', label: 'T2', attributes: { status: 'terminée' }, firstSeenAt: new Date(), lastSeenAt: new Date() });
  await RadarRelation.create({ workspaceId: wsId, fromKey: 'w:t1', toKey: 'email:claire@k.fr', type: 'assigned_to', role: 'assignee', confidence: 1, source: 'rule' });
  await RadarRelation.create({ workspaceId: wsId, fromKey: 'w:t2', toKey: 'email:claire@k.fr', type: 'assigned_to', role: 'assignee', confidence: 1, source: 'rule' });
  const w = await workloadStats(wsId);
  const claire = w.byPerson.find(p => p.person === 'Claire');
  assert.ok(claire, 'Claire présente');
  assert.equal(claire.total, 2);
  assert.equal(claire.open, 1);    // T1 en cours
  assert.equal(claire.done, 1);    // T2 terminée
  console.log(`[test] charge Claire : ${claire.total} items (${claire.open} en cours)`);
});

// ── F. Moteur d'analyse hyper-dynamique (auto-gating) ──

test('analysis-registry : n\'active que les analyses dont la donnée existe', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  const { profileWorkspace, ANALYZERS } = require('../analysis-registry');
  const RadarEntity = require('../../db/models/radar-entity.model');
  const ws2 = new mongoose.Types.ObjectId();
  // entreprise SANS stock ni production : juste des factures
  await RadarEntity.create({ workspaceId: ws2, coreType: 'Transaction', subtype: 'invoice', canonicalKey: 'd:inv:z', label: 'F', attributes: { amount_total: '100' }, firstSeenAt: new Date(), lastSeenAt: new Date() });
  const prof = await profileWorkspace(ws2);
  const stock = ANALYZERS.find(a => a.key === 'stock');
  const prod = ANALYZERS.find(a => a.key === 'production');
  const fin = ANALYZERS.find(a => a.key === 'financial');
  assert.equal(stock.applies(prof), false, 'pas de stock → analyse stock NON activée');
  assert.equal(prod.applies(prof), false, 'pas de production → NON activée');
  assert.equal(fin.applies(prof), true, 'des factures → financier activé');
  await RadarEntity.deleteMany({ workspaceId: ws2 });
  console.log('[test] auto-gating : stock/prod ignorés sans données, financier activé');
});
