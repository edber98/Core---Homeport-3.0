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
      resolve({ decision: dec, approvedSteps: ev.approvedSteps || [], modifiedSteps: ev.modifiedSteps || null });
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      off();
      resolve({ decision: 'reject', approvedSteps: [], modifiedSteps: null });
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
};
