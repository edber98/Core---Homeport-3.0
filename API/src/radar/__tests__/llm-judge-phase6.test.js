// Test LLM réel phase 6 — le superviseur SUIT les procédures de l'entreprise.
// Un playbook « Client mécontent » impose : notifier + préparer un brouillon
// d'excuse (à valider) + rappel à 24h. Un signal client_complaint arrive.
// Attendu : le superviseur applique la procédure (notification + card de
// proposition + wakeup ~24h) et marque le playbook utilisé.
// Sauté sans ANTHROPIC_API_KEY ou sans Mongo.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_radar_p6llm_test';

let ready = !!API_KEY;
let skipReason = API_KEY ? null : 'ANTHROPIC_API_KEY absente';
let wsId, playbookId;

test.before(async () => {
  if (!ready) return;
  try {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
    await mongoose.connection.db.dropDatabase();
  } catch { ready = false; skipReason = 'MongoDB local injoignable'; return; }

  const Workspace = require('../../db/models/workspace.model');
  const WorkspaceMembership = require('../../db/models/workspace-membership.model');
  const RadarConnector = require('../../db/models/radar-connector.model');
  const RadarPlaybook = require('../../db/models/radar-playbook.model');
  const RadarSignal = require('../../db/models/radar-signal.model');
  const RadarKnowledge = require('../../db/models/radar-knowledge.model');

  const ws = await Workspace.create({ name: 'Radar P6 LLM', companyId: new mongoose.Types.ObjectId() });
  wsId = ws._id;
  await WorkspaceMembership.create({ userId: new mongoose.Types.ObjectId(), workspaceId: wsId, role: 'owner' });
  await RadarConnector.create({ workspaceId: wsId, family: 'email', providerKey: 'gmail', label: 'Boîte direction', status: 'active' });

  const pb = await RadarPlaybook.create({
    workspaceId: wsId,
    name: 'Client mécontent',
    triggerCategories: ['client_complaint'],
    triggerDescription: 'Un client exprime un mécontentement fort',
    procedure: '1. Envoyer immédiatement une notification critical à Edouard.\n2. Préparer un brouillon de réponse d\'excuse (proposition à valider sur le board, ne JAMAIS envoyer sans validation).\n3. Programmer un rappel dans 24 heures pour vérifier que le client a été recontacté.',
    autonomy: 'propose', enabled: true,
  });
  playbookId = pb.id;

  await RadarKnowledge.create({ workspaceId: wsId, topic: 'contacts', key: 'dirigeant', value: 'Edouard Bernier (edouard@entreprise.fr)', source: 'wizard' });

  await RadarSignal.create({
    workspaceId: wsId, family: 'email', category: 'client_complaint', urgency: 'high', source: 'llm',
    summary: 'M. Dupont (Société ClientX) menace d\'annuler sa commande : « trois semaines que nous attendons la livraison, c\'est inadmissible, sans réponse sous 48h nous annulons » (mail du jour, commande n° CMD-2026-118)',
    deltaIds: ['rdel_p6_1'], entities: ['M. Dupont', 'ClientX', 'CMD-2026-118'],
  });
});

test.after(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  }
});

test('superviseur réel : il applique le playbook « Client mécontent »', { timeout: 300_000 }, async (t) => {
  if (!ready) return t.skip(skipReason);
  const { runSupervisorPass } = require('../supervisor');
  const RadarSignal = require('../../db/models/radar-signal.model');
  const RadarPlaybook = require('../../db/models/radar-playbook.model');
  const RadarWakeup = require('../../db/models/radar-wakeup.model');
  const RadarCard = require('../../db/models/radar-card.model');
  const Notification = require('../../db/models/notification.model');

  const stats = await runSupervisorPass({ missionDryRun: true });
  assert.equal(stats.workspaces, 1);

  // Signal traité
  const sig = await RadarSignal.findOne({ workspaceId: wsId, category: 'client_complaint' }).lean();
  assert.equal(sig.status, 'handled', `le signal doit être traité (${sig.status})`);

  // Étape 1 du playbook : notification (critical attendu)
  const notifs = await Notification.find({ workspaceId: wsId, entityType: 'radar' }).lean();
  assert.ok(notifs.length >= 1, 'la procédure impose une notification immédiate');

  // Étape 2 : une card de proposition (brouillon d'excuse à valider) — jamais d'envoi direct
  const cards = await RadarCard.find({ workspaceId: wsId }).lean();
  assert.ok(cards.length >= 1, 'la procédure impose une proposition sur le board');
  const allText = (cards.map(c => `${c.title} ${c.payload?.markdown || ''} ${c.payload?.proposedAction || ''}`).join(' ')
    + ' ' + notifs.map(n => n.message).join(' '));
  assert.match(allText, /Dupont|ClientX|CMD-2026-118/i, 'le contenu doit être factuel (client/commande)');

  // Étape 3 : rappel programmé (~24h, tolérance 12-36h)
  const wakeups = await RadarWakeup.find({ workspaceId: wsId, status: 'pending' }).lean();
  const in12h = Date.now() + 12 * 3600_000;
  const in36h = Date.now() + 36 * 3600_000;
  const reminder = wakeups.find(w => new Date(w.at).getTime() > in12h && new Date(w.at).getTime() < in36h);
  assert.ok(reminder, `la procédure impose un rappel à ~24h (réveils: ${wakeups.map(w => w.at).join(', ')})`);

  // Le playbook est marqué utilisé
  const pb = await RadarPlaybook.findOne({ id: playbookId }).lean();
  assert.ok(pb.stats.timesUsed >= 1, 'mark_playbook_used attendu');

  console.log(`[test] playbook appliqué : ${notifs.length} notif(s), ${cards.length} card(s), rappel à ${reminder.at}`);
});
