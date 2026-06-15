// Tests d'intégration phase 3 sur vraie base Mongo locale (jetable) :
// passe de signifiance (classificateur LLM injecté), méta-outils du
// superviseur, et boucle de mission avec critique + retry (agent injecté).
// Sautés si Mongo injoignable.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_radar_p3_test';

let mongoUp = true;
let RadarConnector, RadarDelta, RadarSignal, RadarMission, RadarWakeup, Notification;
let runSignificancePass, buildSupervisorToolSet, getRadarOverview, runMissionLoop, launchMission, resolveSystemActor;
let wsId, companyId;

test.before(async () => {
  try {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
    await mongoose.connection.db.dropDatabase();
  } catch { mongoUp = false; return; }

  const Workspace = require('../../db/models/workspace.model');
  const WorkspaceMembership = require('../../db/models/workspace-membership.model');
  RadarConnector = require('../../db/models/radar-connector.model');
  RadarDelta = require('../../db/models/radar-delta.model');
  RadarSignal = require('../../db/models/radar-signal.model');
  RadarMission = require('../../db/models/radar-mission.model');
  RadarWakeup = require('../../db/models/radar-wakeup.model');
  Notification = require('../../db/models/notification.model');
  ({ runSignificancePass } = require('../significance'));
  ({ buildSupervisorToolSet, getRadarOverview } = require('../supervisor'));
  ({ runMissionLoop, launchMission } = require('../missions'));
  ({ resolveSystemActor } = require('../actor'));

  companyId = new mongoose.Types.ObjectId();
  const ws = await Workspace.create({ name: 'Radar Test', companyId });
  wsId = ws._id;
  await WorkspaceMembership.create({ userId: new mongoose.Types.ObjectId(), workspaceId: wsId, role: 'owner' });
  await RadarConnector.create({ workspaceId: wsId, family: 'accounting', providerKey: 'fakeacct', label: 'Compta', status: 'active' });
});

test.after(async () => {
  if (!mongoUp) return;
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

let _seq = 0;
function delta(over) {
  return {
    id: require('../../utils/ids').newId('rdel'),
    workspaceId: wsId, connectorId: new mongoose.Types.ObjectId(),
    entityKey: `k${++_seq}`,
    status: 'pending', occurredAt: new Date(), ...over,
  };
}

test('signifiance : règles + classificateur injecté → signaux groupés, deltas consommés/ignorés', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const d1 = delta({ family: 'accounting', entityType: 'supplier_invoice', type: 'created', after: { amount_total: 500 } });
  const d2 = delta({ family: 'accounting', entityType: 'supplier_invoice', type: 'created', after: { amount_total: 800 } });
  const d3 = delta({ family: 'email', entityType: 'email_message', type: 'created', after: { from: 'no-reply@spam.fr', subject: 'newsletter' } });
  const d4 = delta({ family: 'email', entityType: 'email_message', type: 'created', after: { from: 'cabinet@ec.fr', subject: 'Factures avril ?' } });
  const d5 = delta({ family: 'email', entityType: 'email_message', type: 'created', after: { from: 'ami@perso.fr', subject: 'verre ce soir ?' } });
  await RadarDelta.insertMany([d1, d2, d3, d4, d5]);

  const classified = [];
  const stats = await runSignificancePass({
    classify: async (compacts) => {
      classified.push(...compacts.map(c => c.id));
      return compacts.map(c => c.id === d4.id
        ? { id: c.id, significant: true, category: 'accounting_request', urgency: 'high', summary: 'L\'expert-comptable demande si les factures d\'avril sont saisies', entities: ['expert-comptable'] }
        : { id: c.id, significant: false });
    },
  });

  assert.equal(stats.examined, 5);
  // d3 ignoré par règles, d5 par LLM → 2 ignorés
  assert.equal(stats.ignored, 2);
  // 1 signal règles (d1+d2 groupés) + 1 signal LLM (d4)
  assert.equal(stats.signals, 2);
  // Seuls les ambigus non filtrés par règles passent à l'étage 2 (d4, d5 — pas d3)
  assert.deepEqual(classified.sort(), [d4.id, d5.id].sort());

  const rules = await RadarSignal.findOne({ workspaceId: wsId, source: 'rules' }).lean();
  assert.equal(rules.category, 'accounting_change');
  assert.deepEqual(rules.deltaIds.sort(), [d1.id, d2.id].sort());
  const llm = await RadarSignal.findOne({ workspaceId: wsId, source: 'llm' }).lean();
  assert.equal(llm.category, 'accounting_request');
  assert.equal(llm.urgency, 'high');
  assert.match(llm.summary, /expert-comptable/);

  // plus aucun delta pending
  assert.equal(await RadarDelta.countDocuments({ status: 'pending' }), 0);
  assert.equal(await RadarDelta.countDocuments({ status: 'ignored' }), 2);
});

test('signifiance : sans LLM (classify null) → repli prudent en signal low', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const d = delta({ family: 'email', entityType: 'email_message', type: 'created', after: { from: 'inconnu@x.fr', subject: 'Question' } });
  await RadarDelta.insertMany([d]);
  const stats = await runSignificancePass({ classify: async () => null });
  assert.equal(stats.signals, 1);
  const sig = await RadarSignal.findOne({ deltaIds: d.id }).lean();
  assert.equal(sig.urgency, 'low');
  assert.equal(sig.source, 'rules');
});

test('acteur système : owner du workspace résolu', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const actor = await resolveSystemActor(wsId);
  assert.ok(actor);
  assert.equal(actor.companyId, String(companyId));
});

test('méta-outils superviseur : launch_mission (dryRun), resolve_signal, schedule_wakeup, send_notification, overview', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const sig = await RadarSignal.findOne({ workspaceId: wsId, source: 'llm' }).lean();
  const toolSet = buildSupervisorToolSet({ workspaceId: wsId, companyId, missionDryRun: true });

  const m = await toolSet.execute('launch_mission', {
    title: 'Vérifier les factures d\'avril',
    prompt: 'Croiser les factures reçues par mail avec celles saisies en compta.',
    successCriteria: ['liste exhaustive', 'croisement effectué'],
    signalIds: [sig.id],
  });
  assert.equal(m.ok, true);
  const mission = await RadarMission.findOne({ id: m.missionId }).lean();
  assert.equal(mission.status, 'queued'); // dryRun → pas exécutée
  assert.deepEqual(mission.signalIds, [sig.id]);
  const sigAfter = await RadarSignal.findOne({ id: sig.id }).lean();
  assert.deepEqual(sigAfter.missionIds, [m.missionId]);

  const r = await toolSet.execute('resolve_signal', { signalId: sig.id, resolution: 'handled', note: 'Mission lancée' });
  assert.equal(r.ok, true);
  assert.equal((await RadarSignal.findOne({ id: sig.id }).lean()).status, 'handled');
  assert.equal((await toolSet.execute('resolve_signal', { signalId: 'rsig_inexistant', resolution: 'handled', note: 'x' })).ok, false);

  const w = await toolSet.execute('schedule_wakeup', { inMinutes: 60, reason: 'revoir demain' });
  assert.equal(w.ok, true);
  assert.equal((await RadarWakeup.findOne({ id: w.wakeupId }).lean()).status, 'pending');

  const n = await toolSet.execute('send_notification', { severity: 'warning', message: 'Facture manquante détectée' });
  assert.equal(n.ok, true);
  const notif = await Notification.findOne({ workspaceId: wsId, entityType: 'radar' }).lean();
  assert.equal(notif.severity, 'warning');
  assert.equal(notif.code, 'radar_supervisor');

  const o = await toolSet.execute('get_radar_overview', {});
  assert.equal(o.connectors.length, 1);
  assert.ok(o.recentMissions.find(x => x.id === m.missionId));

  assert.deepEqual(toolSet.actions.missions, [m.missionId]);
  assert.deepEqual(toolSet.actions.resolved, [sig.id]);
});

test('mission : succès première tentative → done + wakeup mission_completed', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const mission = await launchMission({ workspaceId: wsId, title: 'M ok', prompt: 'Fais X', successCriteria: ['X fait'], dryRun: true });
  const done = await runMissionLoop(mission.id, {
    runAgent: async () => 'X a été fait : rapport complet.',
    critique: async () => ({ met: true, critique: null }),
  });
  assert.equal(done.status, 'done');
  assert.equal(done.attempts, 1);
  assert.equal(done.result, 'X a été fait : rapport complet.');
  const wk = await RadarWakeup.findOne({ 'payload.missionId': mission.id }).lean();
  assert.equal(wk.reason, 'mission_completed');
});

test('mission : critique négative → retry avec critique injectée, puis succès', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const mission = await launchMission({ workspaceId: wsId, title: 'M retry', prompt: 'Fais Y', successCriteria: ['Y exhaustif'], maxAttempts: 3, dryRun: true });
  const prompts = [];
  let call = 0;
  const done = await runMissionLoop(mission.id, {
    runAgent: async (m, prompt) => { prompts.push(prompt); return ++call === 1 ? 'fait en partie' : 'Y exhaustif, tout est listé.'; },
    critique: async (m, result) => result.includes('exhaustif') ? { met: true } : { met: false, critique: 'Il manque la moitié des éléments.' },
  });
  assert.equal(done.status, 'done');
  assert.equal(done.attempts, 2);
  assert.equal(done.history.length, 2);
  assert.equal(done.history[0].critiqueMet, false);
  assert.match(prompts[1], /Tentative précédente insuffisante/);
  assert.match(prompts[1], /la moitié des éléments/);
});

test('mission : échec après maxAttempts → failed + wakeup mission_failed', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const mission = await launchMission({ workspaceId: wsId, title: 'M fail', prompt: 'Fais Z', successCriteria: ['Z parfait'], maxAttempts: 2, dryRun: true });
  const done = await runMissionLoop(mission.id, {
    runAgent: async () => 'tentative médiocre',
    critique: async () => ({ met: false, critique: 'Insuffisant.' }),
  });
  assert.equal(done.status, 'failed');
  assert.equal(done.attempts, 2);
  assert.equal(done.error, 'success_criteria_not_met');
  const wk = await RadarWakeup.findOne({ 'payload.missionId': mission.id }).lean();
  assert.equal(wk.reason, 'mission_failed');
});

test('mission : crash de l\'agent → failed avec erreur + wakeup', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const mission = await launchMission({ workspaceId: wsId, title: 'M crash', prompt: 'Boom', successCriteria: [], dryRun: true });
  const done = await runMissionLoop(mission.id, {
    runAgent: async () => { throw new Error('provider_unreachable'); },
  });
  assert.equal(done.status, 'failed');
  assert.match(done.error, /provider_unreachable/);
});
