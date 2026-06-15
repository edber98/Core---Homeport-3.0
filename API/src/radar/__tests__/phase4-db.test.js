// Tests d'intégration phase 4 (board) sur vraie base Mongo locale :
// outils add_card/close_card du superviseur, vue board groupée par sections,
// boucle de réponse utilisateur (validate/modify/dismiss/answer → wakeup),
// et facturation des appels llm radar (debit via panel-credits mocké par env).
// Sautés si Mongo injoignable.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_radar_p4_test';

let mongoUp = true;
let RadarCard, RadarWakeup;
let buildSupervisorToolSet, getRadarOverview, getBoard, respondToCard;
let wsId, companyId, toolSet;

test.before(async () => {
  try {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
    await mongoose.connection.db.dropDatabase();
  } catch { mongoUp = false; return; }

  const Workspace = require('../../db/models/workspace.model');
  const WorkspaceMembership = require('../../db/models/workspace-membership.model');
  RadarCard = require('../../db/models/radar-card.model');
  RadarWakeup = require('../../db/models/radar-wakeup.model');
  ({ buildSupervisorToolSet, getRadarOverview } = require('../supervisor'));
  ({ getBoard, respondToCard } = require('../board'));

  companyId = new mongoose.Types.ObjectId();
  const ws = await Workspace.create({ name: 'Board Test', companyId });
  wsId = ws._id;
  await WorkspaceMembership.create({ userId: new mongoose.Types.ObjectId(), workspaceId: wsId, role: 'owner' });
  toolSet = buildSupervisorToolSet({ workspaceId: wsId, companyId, missionDryRun: true });
});

test.after(async () => {
  if (!mongoUp) return;
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

let proposalId, questionId;

test('add_card : le superviseur compose le board (sections, priorités, payloads)', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const b = await toolSet.execute('add_card', { type: 'briefing', title: 'Bonjour Edouard', section: 'Aujourd\'hui', priority: 5, markdown: '**3 devis** à relancer, 2 factures en attente.' });
  const a = await toolSet.execute('add_card', { type: 'alert', title: 'Risque client Société ABC', section: 'À traiter maintenant', priority: 1, markdown: 'Score de colère 87/100.', severity: 'critical' });
  const p = await toolSet.execute('add_card', { type: 'action_proposal', title: 'Relancer le devis D-2026-042', section: 'À traiter maintenant', priority: 2, markdown: 'Devis de **12 500 €** sans réponse depuis 15 jours.', proposedAction: 'Envoyer le mail de relance pré-rédigé au client.' });
  const q = await toolSet.execute('add_card', { type: 'question', title: 'Classement des factures', markdown: '', question: 'Où ranges-tu les factures fournisseurs validées ?' });
  for (const r of [b, a, p, q]) assert.equal(r.ok, true);
  proposalId = p.cardId; questionId = q.cardId;

  const proposal = await RadarCard.findOne({ id: proposalId }).lean();
  assert.equal(proposal.requiresResponse, true, 'action_proposal exige une réponse');
  assert.equal(proposal.payload.proposedAction, 'Envoyer le mail de relance pré-rédigé au client.');
});

test('getBoard : sections par nature (À valider / Alertes / Informations)', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const board = await getBoard(wsId);
  assert.equal(board.openCount, 4);
  // Regroupement stable par TYPE de card, pas par le libellé figé du superviseur
  assert.deepEqual(board.sections.map(s => s.title), ['À valider', 'Alertes', 'Informations']);
  const aValider = board.sections.find(s => s.title === 'À valider');
  // action_proposal + question → « À valider », triés par priorité
  assert.deepEqual(aValider.cards.map(c => c.title).sort(), ['Classement des factures', 'Relancer le devis D-2026-042'].sort());
  assert.equal(board.sections.find(s => s.title === 'Alertes').cards[0].title, 'Risque client Société ABC');
  assert.equal(board.sections.find(s => s.title === 'Informations').cards[0].title, 'Bonjour Edouard');
});

test('overview superviseur : les cards ouvertes apparaissent dans le briefing', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const o = await getRadarOverview(wsId);
  assert.equal(o.openCards.length, 4);
  assert.ok(o.openCards.find(c => c.id === proposalId && c.requiresResponse));
});

test('respondToCard validate : état + wakeup card_response avec contexte complet', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const userId = new mongoose.Types.ObjectId();
  const out = await respondToCard({ workspaceId: wsId, cardId: proposalId, action: 'validate', userId });
  assert.equal(out.ok, true);
  assert.equal(out.card.state, 'validated');

  const wk = await RadarWakeup.findOne({ 'payload.cardId': proposalId }).lean();
  assert.equal(wk.reason, 'card_response');
  assert.equal(wk.payload.action, 'validate');
  assert.equal(wk.payload.cardType, 'action_proposal');
  assert.equal(wk.status, 'pending');

  // une card fermée ne peut plus recevoir de réponse
  const again = await respondToCard({ workspaceId: wsId, cardId: proposalId, action: 'dismiss' });
  assert.equal(again.ok, false);
  assert.match(again.error, /card_not_open/);
});

test('respondToCard answer : la réponse à une question revient au superviseur', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const ko = await respondToCard({ workspaceId: wsId, cardId: questionId, action: 'answer', answer: '   ' });
  assert.equal(ko.ok, false);
  const out = await respondToCard({ workspaceId: wsId, cardId: questionId, action: 'answer', answer: 'Dans /Compta/Fournisseurs/{ANNEE}/{MOIS}' });
  assert.equal(out.ok, true);
  const wk = await RadarWakeup.findOne({ 'payload.cardId': questionId }).lean();
  assert.match(wk.payload.answer, /Compta\/Fournisseurs/);
});

test('respondToCard : action inconnue et card inexistante refusées', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  assert.equal((await respondToCard({ workspaceId: wsId, cardId: 'rcrd_x', action: 'validate' })).error, 'card_not_found');
  assert.match((await respondToCard({ workspaceId: wsId, cardId: 'rcrd_x', action: 'explode' })).error || '', /invalid_action/);
});

test('close_card : le superviseur nettoie le board', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const alert = await RadarCard.findOne({ workspaceId: wsId, type: 'alert' }).lean();
  const r = await toolSet.execute('close_card', { cardId: alert.id, state: 'done', note: 'Client rappelé, incident clos.' });
  assert.equal(r.ok, true);
  const after = await RadarCard.findOne({ id: alert.id }).lean();
  assert.equal(after.state, 'done');
  assert.equal(after.closedNote, 'Client rappelé, incident clos.');
  // fermer deux fois → erreur propre
  assert.equal((await toolSet.execute('close_card', { cardId: alert.id, state: 'done' })).ok, false);

  const board = await getBoard(wsId);
  assert.equal(board.openCount, 1); // il ne reste que le briefing
  assert.ok(board.recentClosed.length >= 3);
});

test('expiration paresseuse : une card expirée disparaît du board', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  await RadarCard.create({ workspaceId: wsId, type: 'alert', title: 'Vieille alerte', expiresAt: new Date(Date.now() - 1000) });
  const board = await getBoard(wsId);
  assert.ok(!board.sections.flatMap(s => s.cards).find(c => c.title === 'Vieille alerte'));
  assert.equal((await RadarCard.findOne({ title: 'Vieille alerte' }).lean()).state, 'expired');
});

test('facturation : billing désactivé → resolveBillingFor null ; debitRadarUsage sans billing inoffensif', async (t) => {
  if (!mongoUp) return t.skip('MongoDB local injoignable');
  const { resolveBillingFor, debitRadarUsage, isBillingEnabled } = require('../billing');
  // Dans l'environnement de test, panel-credits n'est pas configuré → désactivé
  if (!isBillingEnabled()) {
    assert.equal(await resolveBillingFor(wsId, 'supervisor'), null);
    assert.equal(await debitRadarUsage({ billing: null, provider: 'anthropic', model: 'x', usage: { input: 10, output: 5 } }), null);
  } else {
    const billing = await resolveBillingFor(wsId, 'supervisor');
    assert.ok(billing && billing.userId, 'billing actif → payeur résolu (owner du workspace)');
  }
});
