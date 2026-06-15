// Test LLM réel phase 4 — le superviseur compose le BOARD.
// Scénario : une mission « vérification factures avril » vient de se terminer
// avec un résultat actionnable (2 factures manquantes). Le superviseur est
// réveillé (mission_completed). Attendu : il met le résultat sur le board —
// au minimum une card, idéalement une action_proposal à valider — et il ne
// déclenche RIEN de sortant directement.
// Sauté sans ANTHROPIC_API_KEY ou sans Mongo.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_radar_p4llm_test';

let ready = !!API_KEY;
let skipReason = API_KEY ? null : 'ANTHROPIC_API_KEY absente';
let wsId;

test.before(async () => {
  if (!ready) return;
  try {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
    await mongoose.connection.db.dropDatabase();
  } catch { ready = false; skipReason = 'MongoDB local injoignable'; return; }

  const Workspace = require('../../db/models/workspace.model');
  const WorkspaceMembership = require('../../db/models/workspace-membership.model');
  const RadarConnector = require('../../db/models/radar-connector.model');
  const RadarMission = require('../../db/models/radar-mission.model');
  const RadarWakeup = require('../../db/models/radar-wakeup.model');

  const ws = await Workspace.create({ name: 'Radar Board LLM', companyId: new mongoose.Types.ObjectId() });
  wsId = ws._id;
  await WorkspaceMembership.create({ userId: new mongoose.Types.ObjectId(), workspaceId: wsId, role: 'owner' });
  await RadarConnector.create({ workspaceId: wsId, family: 'accounting', providerKey: 'odoo', label: 'Compta Odoo', status: 'active' });
  await RadarConnector.create({ workspaceId: wsId, family: 'email', providerKey: 'gmail', label: 'Boîte direction', status: 'active' });

  const mission = await RadarMission.create({
    workspaceId: wsId,
    title: 'Vérif exhaustivité factures fournisseurs avril (TVA)',
    prompt: 'Croiser les factures fournisseurs d\'avril reçues par mail avec celles saisies dans Odoo.',
    successCriteria: ['croisement effectué', 'liste des manquantes'],
    status: 'done', attempts: 1,
    result: `Croisement terminé.
- 14 factures fournisseurs d'avril saisies dans Odoo (total 23 410,50 € HT).
- 16 factures fournisseurs détectées dans les mails d'avril.
- 2 factures reçues par mail ABSENTES d'Odoo :
  1. Sarl Plastiform — facture PF-2026-0412 du 18/04/2026 — 1 842,00 € TTC (mail du 18/04, PJ "PF-2026-0412.pdf")
  2. Trans Express — facture TE-88123 du 29/04/2026 — 640,80 € TTC (mail du 29/04, PJ "TE-88123.pdf")
- Réponse à la question de l'expert-comptable : NON, l'exhaustivité n'est pas atteinte tant que ces 2 factures ne sont pas saisies.`,
  });
  await RadarWakeup.create({
    workspaceId: wsId, at: new Date(), reason: 'mission_completed',
    payload: { missionId: mission.id, title: mission.title },
  });
});

test.after(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  }
});

test('superviseur réel : il publie le résultat de mission sur le board (cards)', { timeout: 300_000 }, async (t) => {
  if (!ready) return t.skip(skipReason);
  const { runSupervisorPass } = require('../supervisor');
  const RadarCard = require('../../db/models/radar-card.model');
  const RadarWakeup = require('../../db/models/radar-wakeup.model');
  const { getBoard } = require('../board');

  const stats = await runSupervisorPass({ missionDryRun: true });
  assert.equal(stats.workspaces, 1);

  const cards = await RadarCard.find({ workspaceId: wsId }).lean();
  assert.ok(cards.length >= 1, 'le superviseur doit publier au moins une card');

  // Le contenu doit être factuel : les 2 factures manquantes doivent y figurer
  const allText = cards.map(c => `${c.title} ${c.payload?.markdown || ''} ${c.payload?.proposedAction || ''}`).join(' ');
  assert.match(allText, /PF-2026-0412|Plastiform/i, 'la facture Plastiform doit apparaître sur le board');
  assert.match(allText, /TE-88123|Trans Express/i, 'la facture Trans Express doit apparaître sur le board');

  // Toute suite sortante (saisir les factures, répondre à l'expert-comptable)
  // doit passer par une proposition à valider — pas d'exécution directe.
  const proposals = cards.filter(c => c.type === 'action_proposal');
  if (proposals.length) {
    assert.ok(proposals.every(p => p.requiresResponse), 'les propositions exigent une validation');
    console.log(`[test] proposition: "${proposals[0].title}" → ${proposals[0].payload.proposedAction}`);
  }

  // Le wakeup a été consommé
  assert.equal(await RadarWakeup.countDocuments({ workspaceId: wsId, status: 'pending', reason: 'mission_completed' }), 0);

  const board = await getBoard(wsId);
  console.log(`[test] board: ${board.openCount} card(s) — sections: ${board.sections.map(s => `"${s.title}" (${s.cards.length})`).join(', ')}`);

  // Boucle complète : l'utilisateur valide la première proposition → wakeup card_response
  if (proposals.length) {
    const { respondToCard } = require('../board');
    const out = await respondToCard({ workspaceId: wsId, cardId: proposals[0].id, action: 'validate' });
    assert.equal(out.ok, true);
    const wk = await RadarWakeup.findOne({ 'payload.cardId': proposals[0].id }).lean();
    assert.equal(wk.reason, 'card_response');
  }
});
