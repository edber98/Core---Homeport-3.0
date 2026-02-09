const FileRecord = require('../db/models/file.model');
const { getAdapter, parseDuration } = require('./file-storage');
const env = require('../config/env');

let _interval = null;

/**
 * Clean up expired temp files (based on expiresAt).
 */
async function cleanupExpired() {
  const now = new Date();
  const expired = await FileRecord.find({ lifecycle: 'temp', expiresAt: { $lte: now } }).lean();
  if (!expired.length) return 0;

  const adapter = getAdapter();
  let count = 0;
  for (const rec of expired) {
    try {
      await adapter.delete(rec.storagePath);
      await FileRecord.deleteOne({ _id: rec._id });
      count++;
    } catch (e) {
      console.error(`[file-cleanup] failed to clean ${rec.id}:`, e.message);
    }
  }
  if (count) console.log(`[file-cleanup] removed ${count} expired temp files`);
  return count;
}

/**
 * Clean up execution files for a finished run (called after run completes + delay).
 */
async function cleanupRun(runId) {
  if (!runId) return 0;
  const files = await FileRecord.find({ lifecycle: 'execution', runId }).lean();
  if (!files.length) return 0;

  const adapter = getAdapter();
  let count = 0;
  for (const rec of files) {
    try {
      await adapter.delete(rec.storagePath);
      await FileRecord.deleteOne({ _id: rec._id });
      count++;
    } catch (e) {
      console.error(`[file-cleanup] failed to clean run file ${rec.id}:`, e.message);
    }
  }
  if (count) console.log(`[file-cleanup] removed ${count} execution files for run ${runId}`);
  return count;
}

/**
 * Schedule periodic cleanup of expired temp files.
 */
function startCleanupCron() {
  if (_interval) return;
  const ms = parseDuration(env.FILE_CLEANUP_INTERVAL);
  if (!ms || ms < 10000) return;
  console.log(`[file-cleanup] cron started, interval=${env.FILE_CLEANUP_INTERVAL}`);
  _interval = setInterval(async () => {
    try { await cleanupExpired(); } catch (e) {
      console.error('[file-cleanup] cron error:', e.message);
    }
  }, ms);
  _interval.unref();
}

function stopCleanupCron() {
  if (_interval) { clearInterval(_interval); _interval = null; }
}

module.exports = {
  cleanupExpired,
  cleanupRun,
  startCleanupCron,
  stopCleanupCron,
};
