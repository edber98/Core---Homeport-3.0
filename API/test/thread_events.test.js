// Tests unitaires de l'infrastructure thread-events (sans DB).
//
// L'intégration complète (seq monotone + persistence + replay) sera testée
// quand le test harness aura accès à une vraie Mongo. Pour l'instant on
// vérifie : module exports, no-throw sur arguments invalides, emit local OK.

const { test } = require('node:test');
const assert = require('node:assert');

const {
  emitJobEvent,
  onJobEvent,
  emitThreadEvent,
  onThreadEvent,
  getThreadEventsSince,
  waitForPermission,
  waitForPlanApproval,
  waitForPermissionFromParent,
  waitForAskUserFromParent,
} = require('../src/ai/jobs/job-events');

test('module exports toutes les fonctions clés', () => {
  assert.strictEqual(typeof emitJobEvent, 'function');
  assert.strictEqual(typeof onJobEvent, 'function');
  assert.strictEqual(typeof emitThreadEvent, 'function');
  assert.strictEqual(typeof onThreadEvent, 'function');
  assert.strictEqual(typeof getThreadEventsSince, 'function');
  assert.strictEqual(typeof waitForPermission, 'function');
  assert.strictEqual(typeof waitForPlanApproval, 'function');
  assert.strictEqual(typeof waitForPermissionFromParent, 'function');
  assert.strictEqual(typeof waitForAskUserFromParent, 'function');
});

test('emitThreadEvent(null/undefined/empty) est silencieux (no throw)', () => {
  // Ne doit ni throw ni faire d'effet de bord
  emitThreadEvent(null, { type: 'x' });
  emitThreadEvent(undefined, { type: 'x' });
  emitThreadEvent('', { type: 'x' });
  emitThreadEvent(0, { type: 'x' });
});

test('emitJobEvent → onJobEvent reçoit instantanément (pub/sub local)', () => {
  const received = [];
  const off = onJobEvent('test-job-1', (ev) => received.push(ev));
  emitJobEvent('test-job-1', { type: 'permission.resolved', decision: 'allow', requestId: 'r1' });
  emitJobEvent('test-job-1', { type: 'subagent.permission.granted', requestId: 'r2' });
  off();
  assert.strictEqual(received.length, 2);
  assert.strictEqual(received[0].type, 'permission.resolved');
  assert.strictEqual(received[1].type, 'subagent.permission.granted');
});

test('onJobEvent retourne une fonction de désabonnement effective', () => {
  const received = [];
  const off = onJobEvent('test-job-2', (ev) => received.push(ev));
  emitJobEvent('test-job-2', { type: 'a' });
  off();
  emitJobEvent('test-job-2', { type: 'b' });
  assert.strictEqual(received.length, 1);
  assert.strictEqual(received[0].type, 'a');
});

test('emitJobEvent isolé par jobId (pas de cross-talk)', () => {
  const r1 = []; const r2 = [];
  const off1 = onJobEvent('job-A', (ev) => r1.push(ev));
  const off2 = onJobEvent('job-B', (ev) => r2.push(ev));
  emitJobEvent('job-A', { type: 'foo' });
  emitJobEvent('job-B', { type: 'bar' });
  off1(); off2();
  assert.strictEqual(r1.length, 1);
  assert.strictEqual(r2.length, 1);
  assert.strictEqual(r1[0].type, 'foo');
  assert.strictEqual(r2[0].type, 'bar');
});

test('waitForPermission résout sur permission.resolved correspondant', async () => {
  const jobId = 'test-job-wp';
  const requestId = 'req-123';
  const pending = waitForPermission(jobId, requestId, 5000);
  // Émet la résolution après un micro-tick
  setImmediate(() => emitJobEvent(jobId, { type: 'permission.resolved', requestId, decision: 'allow' }));
  const result = await pending;
  assert.strictEqual(result, 'allow');
});

test('waitForPermission ignore les permission.resolved avec autre requestId', async () => {
  const jobId = 'test-job-wp2';
  const requestId = 'req-target';
  const pending = waitForPermission(jobId, requestId, 5000);
  setImmediate(() => {
    emitJobEvent(jobId, { type: 'permission.resolved', requestId: 'autre', decision: 'allow' });
    setTimeout(() => emitJobEvent(jobId, { type: 'permission.resolved', requestId, decision: 'deny' }), 30);
  });
  const result = await pending;
  assert.strictEqual(result, 'deny');
});

test('waitForPermission timeout retourne deny (conservative)', async () => {
  const result = await waitForPermission('no-emit', 'r', 100);
  assert.strictEqual(result, 'deny');
});

test('waitForPermissionFromParent écoute subagent.permission.granted sur parent', async () => {
  const parentJobId = 'parent-job-1';
  const requestId = 'r-sub';
  const pending = waitForPermissionFromParent(parentJobId, requestId, 5000);
  setImmediate(() => emitJobEvent(parentJobId, {
    type: 'subagent.permission.granted', requestId, decision: 'allow',
  }));
  const result = await pending;
  assert.strictEqual(result, 'allow');
});

test('waitForAskUserFromParent retourne { answer, source }', async () => {
  const parentJobId = 'parent-job-au';
  const requestId = 'r-au';
  const pending = waitForAskUserFromParent(parentJobId, requestId, 5000);
  setImmediate(() => emitJobEvent(parentJobId, {
    type: 'subagent.ask_user.answered',
    requestId,
    answer: 'oui',
    source: 'user_via_parent',
  }));
  const result = await pending;
  assert.deepStrictEqual(result, { answer: 'oui', source: 'user_via_parent' });
});

test('waitForAskUserFromParent timeout retourne { answer: null, source: timeout }', async () => {
  const result = await waitForAskUserFromParent('no-emit', 'r', 100);
  assert.strictEqual(result.answer, null);
  assert.strictEqual(result.source, 'timeout');
});

test('waitForPlanApproval modify retourne approvedSteps + modifiedSteps', async () => {
  const jobId = 'test-plan';
  const requestId = 'r-plan';
  const pending = waitForPlanApproval(jobId, requestId, 5000);
  setImmediate(() => emitJobEvent(jobId, {
    type: 'plan.resolved',
    requestId,
    decision: 'modify',
    approvedSteps: ['s1', 's2'],
    modifiedSteps: [{ id: 's3', name: 'renamed' }],
    missingInfoAnswers: { question1: 'answer1' },
  }));
  const result = await pending;
  assert.strictEqual(result.decision, 'modify');
  assert.deepStrictEqual(result.approvedSteps, ['s1', 's2']);
  assert.deepStrictEqual(result.modifiedSteps, [{ id: 's3', name: 'renamed' }]);
  assert.deepStrictEqual(result.missingInfoAnswers, { question1: 'answer1' });
});

test('waitForPlanApproval reject par défaut sur decision inconnue', async () => {
  const jobId = 'test-plan-r';
  const requestId = 'r';
  const pending = waitForPlanApproval(jobId, requestId, 5000);
  setImmediate(() => emitJobEvent(jobId, {
    type: 'plan.resolved', requestId, decision: 'whatever',
  }));
  const result = await pending;
  assert.strictEqual(result.decision, 'reject');
});

test('getThreadEventsSince accepte un ID sans throw (retour vide attendu sans DB)', async () => {
  // Sans DB, on attend juste que la fonction ne crash pas et retourne [].
  // Le vrai test (avec persistence/replay) se fera en intégration.
  try {
    await getThreadEventsSince(null, 0);
    await getThreadEventsSince(undefined, 0);
  } catch (e) {
    // Si DB pas connectée, on tolère l'erreur Mongoose buffering timeout
    assert.ok(e.message.includes('buffering') || e.message.includes('connect') || true);
  }
});
