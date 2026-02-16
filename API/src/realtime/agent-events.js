// Lightweight agent events dispatcher with optional Bee-Queue buffering.
// If AGENT_USE_QUEUE=1 and bee-queue is installed + Redis configured, events are
// enqueued to ensure sequential processing; otherwise falls back to direct send.

let BeeQueue = null;
try { BeeQueue = require('bee-queue'); } catch { BeeQueue = null; }

const useQueue = String(process.env.AGENT_USE_QUEUE || '').trim() === '1' && !!BeeQueue;
let queue = null;
if (useQueue) {
  try {
    queue = new BeeQueue('agent-callback', {
      isWorker: true,
      removeOnSuccess: true,
      removeOnFailure: true,
      redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    });
  } catch (e) {
    // Fallback if Redis not reachable
    queue = null;
  }
}

function createDispatcher(send) {
  if (!useQueue || !queue) {
    return {
      emit: (obj) => { try { send(obj); } catch {} },
      close: () => {},
    };
  }
  // Queue-backed dispatcher: enqueue sequentially and process with concurrency 1
  const localQueue = queue;
  let processingSetup = false;
  function ensureProcessor() {
    if (processingSetup) return; processingSetup = true;
    try {
      localQueue.process(1, async (job) => {
        const payload = job?.data || {};
        try { send(payload.obj); } catch {}
        return { ok: true };
      });
    } catch {}
  }
  ensureProcessor();
  return {
    emit: (obj) => {
      try { localQueue.createJob({ obj }).save(); } catch { try { send(obj); } catch {} }
    },
    close: () => {},
  };
}

module.exports = { createDispatcher };

