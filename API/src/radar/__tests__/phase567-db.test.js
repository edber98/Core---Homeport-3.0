// Tests d'intégration phases 5-7 sur vraie base Mongo locale :
// savoir (RadarKnowledge) + playbooks via les outils superviseur, injection
// dans le briefing, et réconciliations nocturnes (temporel, achats anormaux,
// dérive CA, trésorerie, déduplication). Sautés si Mongo injoignable.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_radar_p567_test';
const DAY = 24 * 3600_000;

let mongoUp = true;
let RadarKnowledge, RadarPlaybook, RadarSignal, RadarSnapshot, RadarConnector, Provider;
let buildSupervisorToolSet, buildBriefing, getRadarOverview;
let reconciliations;
let wsId, companyId, toolSet;

test.before(async () => {
  try {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
    await mongoose.connection.db.dropDatabase();
  } catch { mongoUp = false; return; }

  const Workspace = require('../../db/models/workspace.model');
  const WorkspaceMembership = require('../../db/models/workspace-membership.model');
  RadarKnowledge = require('../../db/models/radar-knowledge.model');
  RadarPlaybook = require('../../db/models/radar-playbook.model');
  RadarSignal = require('../../db/models/radar-signal.model');
  RadarSnapshot = require('../../db/models/radar-snapshot.model');
  RadarConnector = require('../../db/models/radar-connector.model');
  Provider = require('../../db/models/provider.model');
  ({ buildSupervisorToolSet, buildBriefing, getRadarOverview } = require('../supervisor'));
  reconciliations = require('../reconciliations');

  companyId = new mongoose.Types.ObjectId();
  const ws = await Workspace.create({ name: 'P567 Test', companyId });
  wsId = ws._id;
  await WorkspaceMembership.create({ userId: new mongoose.Types.ObjectId(), workspaceId: wsId, role: 'owner' });
  toolSet = buildSupervisorToolSet({ workspaceId: wsId, companyId, missionDryRun: true });
});

test.after(async () => {
  if (!mongoUp) return;
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

// ── Savoir & playbooks (phases 5/6) ──

test('save_knowledge : upsert par (topic, key), confidence et source', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const r1 = await toolSet.execute('save_knowledge', { topic: 'file_structure', key: 'factures fournisseurs', value: '/Compta/AP/2026', confidence: 'inferred' });
  assert.equal(r1.ok, true);
  // ré-écriture du même fait → mise à jour, pas de doublon
  await toolSet.execute('save_knowledge', { topic: 'file_structure', key: 'factures fournisseurs', value: '/Compta/Fournisseurs/{ANNEE}/{MOIS}', confidence: 'confirmed' });
  const all = await RadarKnowledge.find({ workspaceId: wsId, topic: 'file_structure' }).lean();
  assert.equal(all.length, 1);
  assert.match(all[0].value, /ANNEE/);
  assert.equal(all[0].confidence, 'confirmed');
  assert.equal((await toolSet.execute('save_knowledge', { topic: 'custom', key: 'x' })).ok, false);
});

test('propose_playbook : créé en attente d\'approbation, jamais actif silencieusement', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const r = await toolSet.execute('propose_playbook', {
    name: 'Client mécontent',
    triggerCategories: ['client_complaint'],
    triggerDescription: 'Un client exprime un mécontentement fort par mail',
    procedure: '1. Notifier immédiatement.\n2. Préparer un brouillon d\'excuse.\n3. Rappel à 24h.',
  });
  assert.equal(r.ok, true);
  const pb = await RadarPlaybook.findOne({ id: r.playbookId }).lean();
  assert.equal(pb.pendingApproval, true);
  assert.equal(pb.enabled, false);
  assert.equal(pb.source, 'suggested_by_radar');
});

test('briefing : savoir injecté, playbooks actifs seulement (catégorie ou générique)', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  // playbook actif ciblé client_complaint + un générique + le pending (exclu)
  await RadarPlaybook.create({ workspaceId: wsId, name: 'Relance devis', triggerCategories: ['quote_overdue'], procedure: 'Relancer poliment à J+15.', enabled: true });
  await RadarPlaybook.create({ workspaceId: wsId, name: 'Ton général', triggerCategories: [], procedure: 'Toujours vouvoyer.', enabled: true });

  const knowledge = await RadarKnowledge.find({ workspaceId: wsId }).lean();
  const playbooks = await RadarPlaybook.find({ workspaceId: wsId, enabled: true, pendingApproval: { $ne: true } }).lean();
  const overview = await getRadarOverview(wsId);
  const briefing = buildBriefing({
    now: new Date(), overview,
    signals: [{ id: 'rsig_x', category: 'quote_overdue', urgency: 'normal', family: 'crm', summary: 'Devis D-42 sans réponse' }],
    wakeups: [], knowledge, playbooks,
  });
  assert.match(briefing, /Ce que tu sais de l'entreprise/);
  assert.match(briefing, /Compta\/Fournisseurs/);
  assert.match(briefing, /Relance devis/);
  assert.match(briefing, /Toujours vouvoyer/);
  assert.ok(!briefing.includes('Client mécontent'), 'un playbook en attente d\'approbation ne doit PAS être injecté');
});

test('mark_playbook_used : incrémente les stats', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const pb = await RadarPlaybook.findOne({ workspaceId: wsId, name: 'Relance devis' }).lean();
  await toolSet.execute('mark_playbook_used', { playbookId: pb.id });
  await toolSet.execute('mark_playbook_used', { playbookId: pb.id });
  const after = await RadarPlaybook.findOne({ id: pb.id }).lean();
  assert.equal(after.stats.timesUsed, 2);
  assert.ok(after.stats.lastUsedAt);
});

// ── Réconciliations (phase 7) — évaluateurs purs ──

function snap(entityType, data, over = {}) {
  return {
    entityType, entityKey: String(data.id ?? Math.random()), data,
    firstSeenAt: new Date(Date.now() - 40 * DAY), lastChangedAt: null, deletedAt: null, ...over,
  };
}

test('evaluateTemporal stale : devis sans réponse depuis 14 j', (t) => {
  const specs = [{ kind: 'stale', afterDays: 14, whenField: 'state', whenIn: ['sent'], category: 'quote_overdue', label: 'Devis sans réponse' }];
  const old = snap('quote', { id: 1, state: 'sent', amount_total: 12500, partner_name: 'ACME' }, { lastChangedAt: new Date(Date.now() - 20 * DAY) });
  const recent = snap('quote', { id: 2, state: 'sent' }, { lastChangedAt: new Date(Date.now() - 3 * DAY) });
  const won = snap('quote', { id: 3, state: 'sale' }, { lastChangedAt: new Date(Date.now() - 60 * DAY) });
  const out = reconciliations.evaluateTemporal([old, recent, won], specs);
  assert.equal(out.length, 1);
  assert.equal(out[0].category, 'quote_overdue');
  assert.match(out[0].summary, /ACME/);
  assert.match(out[0].summary, /12500/);
});

test('evaluateTemporal expiring : échéance proche, urgence haute à J-7', (t) => {
  const specs = [{ kind: 'expiring', dateField: 'date_end', inDays: 45, category: 'contract_expiring', label: 'Contrat à échéance' }];
  const in40 = snap('contract', { id: 1, date_end: new Date(Date.now() + 40 * DAY).toISOString() });
  const in3 = snap('contract', { id: 2, date_end: new Date(Date.now() + 3 * DAY).toISOString() });
  const past = snap('contract', { id: 3, date_end: new Date(Date.now() - 5 * DAY).toISOString() });
  const out = reconciliations.evaluateTemporal([in40, in3, past], specs);
  assert.equal(out.length, 2);
  assert.equal(out.find(f => f.deltaData.entityKey === '2').urgency, 'high');
  assert.equal(out.find(f => f.deltaData.entityKey === '1').urgency, 'normal');
});

test('evaluateUnusualSpend : mois courant anormal vs historique', (t) => {
  const mk = (monthsAgo, amount, id) => {
    const d = new Date(); d.setMonth(d.getMonth() - monthsAgo);
    return snap('supplier_invoice', { id, amount_total: amount, date: d.toISOString() });
  };
  const snaps = [mk(3, 400, 1), mk(2, 420, 2), mk(1, 380, 3), mk(0, 3200, 4)];
  const out = reconciliations.evaluateUnusualSpend(snaps);
  assert.equal(out.length, 1);
  assert.match(out[0].summary, /3200/);
  // pas assez d'historique → rien
  assert.equal(reconciliations.evaluateUnusualSpend([mk(1, 400, 1), mk(0, 3200, 2)]).length, 0);
});

test('evaluateRevenueDrop : client en baisse de plus de 30 %', (t) => {
  const mk = (daysAgo, amount, partner, id) => snap('customer_invoice', { id, amount_total: amount, partner_name: partner, date: new Date(Date.now() - daysAgo * DAY).toISOString() });
  const snaps = [
    mk(120, 8000, 'Client X', 1), mk(150, 4000, 'Client X', 2), // 12 000 sur la période précédente
    mk(30, 2000, 'Client X', 3),                                 // 2 000 sur les 3 derniers mois (−83 %)
    mk(120, 5000, 'Client Y', 4), mk(30, 4800, 'Client Y', 5),   // stable
  ];
  const out = reconciliations.evaluateRevenueDrop(snaps);
  assert.equal(out.length, 1);
  assert.equal(out[0].deltaData.partner, 'Client X');
  assert.equal(out[0].urgency, 'high');
});

test('evaluateCashPosition : alerte seulement si solde négatif', (t) => {
  const cust = [snap('customer_invoice', { id: 1, amount_total: 5000, payment_state: 'not_paid' })];
  const supp = [
    snap('supplier_invoice', { id: 2, amount_total: 15000, payment_state: 'not_paid' }),
    snap('supplier_invoice', { id: 3, amount_total: 2000, payment_state: 'paid' }), // payée → exclue
  ];
  const out = reconciliations.evaluateCashPosition(cust, supp);
  assert.equal(out.length, 1);
  assert.equal(out[0].deltaData.net, -10000);
  assert.deepEqual(reconciliations.evaluateCashPosition(supp.slice(0, 1), cust), []);
});

// ── Réconciliation de bout en bout + déduplication ──

test('runReconciliationsForWorkspace : signaux créés puis dédupliqués', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  await Provider.create({
    key: 'fakecrm567', name: 'FakeCRM', enabled: true,
    radar: [{
      family: 'crm',
      capabilities: { listQuotes: { template: 'whatever_list' } },
      watch: [{
        entity: 'quote', via: 'listQuotes', key: 'id',
        temporal: [{ kind: 'stale', afterDays: 14, whenField: 'state', whenIn: ['sent'], category: 'quote_overdue', label: 'Devis sans réponse' }],
      }],
    }],
  });
  const conn = await RadarConnector.create({ workspaceId: wsId, family: 'crm', providerKey: 'fakecrm567', status: 'active' });
  await RadarSnapshot.create({
    workspaceId: wsId, connectorId: conn._id, family: 'crm',
    entityType: 'quote', entityKey: '42', contentHash: 'h',
    data: { id: 42, state: 'sent', amount_total: 12500, partner_name: 'Cartonnage du Château' },
    firstSeenAt: new Date(Date.now() - 20 * DAY), lastSeenAt: new Date(),
  });

  const r1 = await reconciliations.runReconciliationsForWorkspace(wsId);
  assert.equal(r1.created, 1);
  const sig = await RadarSignal.findOne({ workspaceId: wsId, category: 'quote_overdue' }).lean();
  assert.equal(sig.source, 'reconciliation');
  assert.match(sig.summary, /Cartonnage du Château/);

  // 2e passe la même nuit → dédupliqué, rien de recréé
  const r2 = await reconciliations.runReconciliationsForWorkspace(wsId);
  assert.equal(r2.findings, 1);
  assert.equal(r2.created, 0);
  assert.equal(await RadarSignal.countDocuments({ workspaceId: wsId, category: 'quote_overdue' }), 1);
});
