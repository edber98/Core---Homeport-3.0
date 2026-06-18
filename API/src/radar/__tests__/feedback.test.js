// P6 — Dataset de feedback (Étage 2) : gating par flag, émission best-effort, stats.

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_feedback_test';
let mongoUp = true;
let emitFeedback, feedbackStats, wsId;

test.before(async () => {
  try {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
    await mongoose.connection.db.dropDatabase();
  } catch { mongoUp = false; return; }
  ({ emitFeedback, feedbackStats } = require('../feedback'));
  wsId = new mongoose.Types.ObjectId();
});

test.after(async () => {
  if (!mongoUp) return;
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
  delete process.env.RADAR_LEARNING_ENABLED;
});

test('P6 — feedback désactivé par défaut : emit ne crée rien', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  delete process.env.RADAR_LEARNING_ENABLED;
  const r = await emitFeedback({ workspaceId: wsId, action: 'validate', targetKind: 'card' });
  assert.equal(r, null, 'aucun feedback si flag off');
  const RadarFeedback = require('../../db/models/radar-feedback.model');
  assert.equal(await RadarFeedback.countDocuments({ workspaceId: wsId }), 0);
});

test('P6 — feedback activé : emit crée un exemple étiqueté + stats', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  process.env.RADAR_LEARNING_ENABLED = '1';
  await emitFeedback({ workspaceId: wsId, userId: 'u1', action: 'dismiss', targetKind: 'card', taskType: 'alert_relevance', features: { cardType: 'alert' }, label: 'dismiss' });
  await emitFeedback({ workspaceId: wsId, userId: 'u1', action: 'requalify', targetKind: 'delta', taskType: 'significance', label: 'significant' });
  await emitFeedback({ workspaceId: wsId, userId: 'u1', action: 'validate', targetKind: 'card', taskType: 'alert_relevance', label: 'validate' });

  const RadarFeedback = require('../../db/models/radar-feedback.model');
  assert.equal(await RadarFeedback.countDocuments({ workspaceId: wsId }), 3);

  const stats = await feedbackStats(wsId);
  assert.equal(stats.total, 3);
  const alert = stats.byTaskType.find(t => t.taskType === 'alert_relevance');
  assert.equal(alert.count, 2);
  const dismiss = stats.byAction.find(a => a.action === 'dismiss');
  assert.equal(dismiss.count, 1);
});

test('P6 — emit best-effort : entrée invalide → null, pas d\'exception', async (t) => {
  if (!mongoUp) return t.skip('MongoDB injoignable');
  process.env.RADAR_LEARNING_ENABLED = '1';
  const r = await emitFeedback({ /* manque workspaceId/action */ });
  assert.equal(r, null);
});
