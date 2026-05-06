// Lightweight in-memory pub/sub for AiJob events (side events, permission
// requests, state transitions). Consumed by SSE endpoints.
//
// When AGENT_USE_QUEUE=1 + bee-queue available, we still use the local emitter
// for subscribers attached to *this* process; cross-process fan-out would go
// through Redis pub/sub — left as a TODO hook.

const { EventEmitter } = require('events');

const _emitter = new EventEmitter();
_emitter.setMaxListeners(0);

function _key(jobId) {
  return `job:${jobId}`;
}
function _threadKey(threadId) {
  return `thread:${threadId}`;
}

function emitJobEvent(jobId, event) {
  _emitter.emit(_key(jobId), event);
}

function emitThreadEvent(threadId, event) {
  if (!threadId) return;
  _emitter.emit(_threadKey(threadId), event);
}

function onThreadEvent(threadId, callback) {
  const key = _threadKey(threadId);
  _emitter.on(key, callback);
  return () => _emitter.off(key, callback);
}

/**
 * Subscribe to a job's events. Returns an unsubscribe function.
 * @param {string} jobId
 * @param {function} callback
 */
function onJobEvent(jobId, callback) {
  const key = _key(jobId);
  _emitter.on(key, callback);
  return () => _emitter.off(key, callback);
}

/**
 * Await a specific permission-request resolution.
 * @param {string} jobId
 * @param {string} requestId
 * @param {number} [timeoutMs=300000]
 * @returns {Promise<'allow'|'deny'>}
 */
function waitForPermission(jobId, requestId, timeoutMs = 300000) {
  return new Promise((resolve) => {
    let settled = false;
    const off = onJobEvent(jobId, (ev) => {
      if (ev?.type !== 'permission.resolved') return;
      if (ev.requestId !== requestId) return;
      if (settled) return;
      settled = true;
      off();
      clearTimeout(timer);
      resolve(ev.decision === 'allow' ? 'allow' : 'deny');
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      off();
      resolve('deny');
    }, timeoutMs);
  });
}

/**
 * Await a specific plan-approval resolution.
 * @param {string} jobId
 * @param {string} requestId
 * @param {number} [timeoutMs=600000]
 * @returns {Promise<{decision:'approve'|'reject'|'modify', approvedSteps?:string[], modifiedSteps?:any[]}>}
 */
function waitForPlanApproval(jobId, requestId, timeoutMs = 600000) {
  return new Promise((resolve) => {
    let settled = false;
    const off = onJobEvent(jobId, (ev) => {
      if (ev?.type !== 'plan.resolved') return;
      if (ev.requestId !== requestId) return;
      if (settled) return;
      settled = true;
      off();
      clearTimeout(timer);
      const dec = ev.decision === 'approve' || ev.decision === 'modify' ? ev.decision : 'reject';
      resolve({
        decision: dec,
        approvedSteps: ev.approvedSteps || [],
        modifiedSteps: ev.modifiedSteps || null,
        missingInfoAnswers: ev.missingInfoAnswers || {},
      });
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      off();
      resolve({ decision: 'reject', approvedSteps: [], modifiedSteps: null, missingInfoAnswers: {} });
    }, timeoutMs);
  });
}

/**
 * Wait for a subagent permission request to be resolved by the parent job.
 *
 * The parent receives a `subagent.permission.request` event (emitted via
 * emitJobEvent on parentJobId). It can resolve it two ways :
 *  1. Directly : emit `subagent.permission.granted` { requestId, decision }
 *     → the child is unblocked with that decision.
 *  2. Escalate : relay to the user via its own ask_user / permission flow.
 *     When the user answers, the parent emits `subagent.permission.granted`.
 *
 * This helper never emits `ai.permission.request` to the thread SSE directly —
 * it's the parent's responsibility if it chooses to escalate.
 *
 * @param {string} parentJobId
 * @param {string} requestId
 * @param {number} [timeoutMs=300000]
 * @returns {Promise<'allow'|'deny'>}
 */
function waitForPermissionFromParent(parentJobId, requestId, timeoutMs = 300000) {
  return new Promise((resolve) => {
    let settled = false;
    const off = onJobEvent(parentJobId, (ev) => {
      if (ev?.type !== 'subagent.permission.granted') return;
      if (ev.requestId !== requestId) return;
      if (settled) return;
      settled = true;
      off();
      clearTimeout(timer);
      resolve(ev.decision === 'allow' ? 'allow' : 'deny');
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      off();
      resolve('deny'); // timeout → deny (conservative)
    }, timeoutMs);
  });
}

/**
 * Wait for a subagent ask_user request to be answered by the parent job.
 * Parent emits `subagent.ask_user.answered` { requestId, answer, source }.
 *
 * @param {string} parentJobId
 * @param {string} requestId
 * @param {number} [timeoutMs=300000]
 * @returns {Promise<{answer:any, source:'parent_auto'|'user_via_parent'|'timeout'}>}
 */
function waitForAskUserFromParent(parentJobId, requestId, timeoutMs = 300000) {
  return new Promise((resolve) => {
    let settled = false;
    const off = onJobEvent(parentJobId, (ev) => {
      if (ev?.type !== 'subagent.ask_user.answered') return;
      if (ev.requestId !== requestId) return;
      if (settled) return;
      settled = true;
      off();
      clearTimeout(timer);
      resolve({ answer: ev.answer, source: ev.source || 'parent_auto' });
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      off();
      resolve({ answer: null, source: 'timeout' });
    }, timeoutMs);
  });
}

module.exports = {
  emitJobEvent,
  onJobEvent,
  emitThreadEvent,
  onThreadEvent,
  waitForPermission,
  waitForPlanApproval,
  waitForPermissionFromParent,
  waitForAskUserFromParent,
};
