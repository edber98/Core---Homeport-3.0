// Resume worker — detects jobs that went stale (running + heartbeatAt older
// than HEARTBEAT_STALE_MS) and flips them to 'queued' to let runJob resume.
//
// Runs on a plain setInterval (no node-cron dep) every 30 seconds.

const AiJob = require('../../db/models/ai-job.model');

const DEFAULT_INTERVAL_MS = 30_000;
const HEARTBEAT_STALE_MS = 60_000;

let _timer = null;

async function _pass() {
  const threshold = new Date(Date.now() - HEARTBEAT_STALE_MS);
  const stale = await AiJob.find({
    status: 'running',
    $or: [
      { heartbeatAt: { $lt: threshold } },
      { heartbeatAt: null },
    ],
  }, '_id id').limit(10).lean();

  if (!stale.length) return;

  for (const s of stale) {
    try {
      // Flip to queued
      const res = await AiJob.updateOne(
        { id: s.id, status: 'running' },
        { $set: { status: 'queued' } }
      );
      if (!res.modifiedCount) continue;
      console.log(`[resume-worker] resuming stalled job ${s.id}`);
      // Async — don't block the pass
      const { resumeJob } = require('./job-runner');
      setImmediate(() => {
        resumeJob(s.id).catch(e => console.error(`[resume-worker] ${s.id} resume failed:`, e?.message));
      });
    } catch (e) {
      console.error('[resume-worker] pass error:', e?.message);
    }
  }
}

function startResumeWorker() {
  if (_timer) return;
  const interval = Number(process.env.AI_RESUME_WORKER_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  console.log(`[resume-worker] starting (interval=${interval}ms)`);
  _timer = setInterval(() => {
    _pass().catch(e => console.error('[resume-worker] top-level:', e?.message));
  }, interval);
}

function stopResumeWorker() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}

module.exports = { startResumeWorker, stopResumeWorker, runResumePass: _pass };
