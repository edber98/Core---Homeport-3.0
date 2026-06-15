// Tests LLM réels de la phase 3 (API Anthropic + Mongo local) :
//  1. le classificateur de signifiance (étage 2) distingue un vrai signal du bruit ;
//  2. le SUPERVISEUR complet traite un briefing réel : il doit résoudre les
//     signaux et prendre des actions sensées (mission auto-promptée en dryRun,
//     notification…) — puis un juge LLM évalue la qualité du prompt de mission
//     qu'il a écrit lui-même.
// Sautés sans ANTHROPIC_API_KEY ou sans Mongo.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_radar_p3llm_test';

let ready = !!API_KEY;
let skipReason = API_KEY ? null : 'ANTHROPIC_API_KEY absente';
let wsId, companyId;

test.before(async () => {
  if (!ready) return;
  try {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
    await mongoose.connection.db.dropDatabase();
  } catch { ready = false; skipReason = 'MongoDB local injoignable'; return; }

  const Workspace = require('../../db/models/workspace.model');
  const WorkspaceMembership = require('../../db/models/workspace-membership.model');
  companyId = new mongoose.Types.ObjectId();
  const ws = await Workspace.create({ name: 'Radar LLM Test', companyId });
  wsId = ws._id;
  await WorkspaceMembership.create({ userId: new mongoose.Types.ObjectId(), workspaceId: wsId, role: 'owner' });
  const RadarConnector = require('../../db/models/radar-connector.model');
  await RadarConnector.create({ workspaceId: wsId, family: 'accounting', providerKey: 'odoo', label: 'Compta Odoo', status: 'active' });
  await RadarConnector.create({ workspaceId: wsId, family: 'email', providerKey: 'gmail', label: 'Boîte direction', status: 'active' });
});

test.after(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  }
});

test('étage 2 réel : l\'email de l\'expert-comptable est signifiant, la newsletter non', { timeout: 120_000 }, async (t) => {
  if (!ready) return t.skip(skipReason);
  const { defaultLlmClassify } = require('../significance');
  const results = await defaultLlmClassify([
    { id: 'd_ec', family: 'email', entityType: 'email_message', type: 'created', after: { from: 'cabinet@durand-expertise.fr', subject: 'Clôture avril', body: 'Bonjour, pouvez-vous confirmer que toutes les factures fournisseurs d\'avril ont bien été saisies dans Odoo ? Il nous les faut pour la TVA avant vendredi.' } },
    { id: 'd_news', family: 'email', entityType: 'email_message', type: 'created', after: { from: 'hello@saaspromo.io', subject: '🎉 -50% sur nos plans annuels', body: 'Dernière chance pour profiter de notre offre exceptionnelle…' } },
    { id: 'd_colere', family: 'email', entityType: 'email_message', type: 'created', after: { from: 'dupont@clientx.fr', subject: 'Inadmissible', body: 'Cela fait trois semaines que nous attendons la livraison, c\'est inadmissible. Sans réponse sous 48h nous annulons la commande.' } },
  ]);
  assert.ok(Array.isArray(results) && results.length === 3);
  const byId = Object.fromEntries(results.map(r => [r.id, r]));
  assert.equal(byId.d_ec.significant, true, 'demande de l\'expert-comptable = signifiante');
  assert.equal(byId.d_news.significant, false, 'newsletter = bruit');
  assert.equal(byId.d_colere.significant, true, 'client en colère = signifiant');
  assert.equal(byId.d_colere.urgency, 'high', 'menace d\'annulation = urgence haute');
});

test('superviseur réel : briefing traité, signaux résolus, mission auto-promptée jugée', { timeout: 300_000 }, async (t) => {
  if (!ready) return t.skip(skipReason);
  const RadarSignal = require('../../db/models/radar-signal.model');
  const RadarMission = require('../../db/models/radar-mission.model');
  const Notification = require('../../db/models/notification.model');
  const { runSupervisorPass } = require('../supervisor');

  const sig1 = await RadarSignal.create({
    workspaceId: wsId, family: 'email', category: 'accounting_request', urgency: 'high', source: 'llm',
    summary: 'L\'expert-comptable (cabinet Durand) demande confirmation que toutes les factures fournisseurs d\'avril sont saisies dans Odoo — nécessaire pour la TVA avant vendredi.',
    deltaIds: ['rdel_test_1'], entities: ['cabinet Durand', 'factures avril', 'TVA'],
  });
  const sig2 = await RadarSignal.create({
    workspaceId: wsId, family: 'accounting', category: 'accounting_change', urgency: 'normal', source: 'rules',
    summary: 'supplier_invoice: 2 créé(s) (884, 885)',
    deltaIds: ['rdel_test_2', 'rdel_test_3'],
  });

  const stats = await runSupervisorPass({ missionDryRun: true });

  assert.equal(stats.workspaces, 1);
  assert.equal(stats.signalsClaimed, 2);

  // Tous les signaux doivent être sortis de pending/processing
  const s1 = await RadarSignal.findOne({ id: sig1.id }).lean();
  const s2 = await RadarSignal.findOne({ id: sig2.id }).lean();
  assert.ok(['handled', 'dismissed'].includes(s1.status), `signal urgent non résolu (${s1.status})`);
  assert.ok(['handled', 'dismissed'].includes(s2.status), `signal normal non résolu (${s2.status})`);
  assert.equal(s1.status, 'handled', 'la demande de l\'expert-comptable doit être TRAITÉE, pas écartée');
  assert.ok(s1.resolution, 'note de résolution attendue');

  // Au moins une action concrète sur le signal urgent : mission ou notification
  const missions = await RadarMission.find({ workspaceId: wsId }).lean();
  const notifs = await Notification.find({ workspaceId: wsId, entityType: 'radar' }).lean();
  assert.ok(missions.length + notifs.length > 0, 'aucune action prise par le superviseur');

  // S'il a lancé une mission (attendu), juger la qualité du prompt qu'il a ÉCRIT LUI-MÊME
  if (missions.length) {
    const m = missions[0];
    assert.equal(m.status, 'queued'); // dryRun
    assert.ok(m.successCriteria.length >= 1, 'critères de succès requis');
    const { llmCompleteJSON } = require('../llm');
    const verdict = await llmCompleteJSON(`Tu audites le prompt d'une mission écrite par un agent superviseur pour répondre à ce besoin :
"L'expert-comptable demande confirmation que toutes les factures fournisseurs d'avril sont saisies dans Odoo (TVA, échéance vendredi)."

## Prompt de mission à auditer
${m.prompt}

## Critères de succès déclarés
${m.successCriteria.map(c => `- ${c}`).join('\n')}

Le prompt est-il actionnable par un agent autonome (objectif clair, période concernée, sources à consulter, format de sortie) et les critères vérifiables ?
Réponds UNIQUEMENT en JSON : {"actionnable": true/false, "problemes": ["..."]}`, { maxTokens: 600 });
    assert.equal(verdict.actionnable, true, `prompt de mission jugé non actionnable: ${JSON.stringify(verdict.problemes)}`);
  }

  console.log(`[test] superviseur: ${missions.length} mission(s), ${notifs.length} notification(s)`);
  if (missions.length) console.log(`[test] mission auto-promptée: "${missions[0].title}" — critères: ${missions[0].successCriteria.join(' | ')}`);
});
