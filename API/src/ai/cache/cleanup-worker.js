// Project cache cleanup worker — periodic background scan.
//
// Responsibilities:
//  - Find idle AiProjectCache entries (lastAccessedAt older than TTL)
//  - Honor user preferences (askBeforeSync / askBeforeCleanup / keepCacheAfterClose)
//  - If dirty files exist + askBeforeSync → emit an AiMessage (kind: cache_sync_request)
//  - Otherwise auto-sync + wipe
//
// No node-cron dependency: we parse a CRON-like string naïvely and fall back to
// a plain setInterval. For cron expressions we support "*/N * * * *" meaning
// every N minutes.

const AiProjectCache = require('../../db/models/ai-project-cache.model');
const AiUserPreferences = require('../../db/models/ai-user-preferences.model');
const AiThread = require('../../db/models/ai-thread.model');
const AiMessage = require('../../db/models/ai-message.model');
const { cleanupCache, listDirty, syncDirtyToRemote } = require('./project-cache');

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000; // 15 min
const DEFAULT_TTL_HOURS = 24;

function parseCronToInterval(expr) {
  if (!expr) return DEFAULT_INTERVAL_MS;
  // Match "*/N * * * *" → every N minutes
  const m = String(expr).match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
  if (m) return Math.max(60_000, parseInt(m[1], 10) * 60_000);
  return DEFAULT_INTERVAL_MS;
}

let _timer = null;

async function _loadPrefs(userId) {
  if (!userId) return null;
  try { return await AiUserPreferences.findOne({ userId }).lean(); }
  catch { return null; }
}

async function _loadThread(threadId) {
  try { return await AiThread.findById(threadId).lean(); }
  catch { return null; }
}

async function _emitCacheSyncRequest(threadId, pendingFiles, sizeBytes) {
  try {
    await AiMessage.create({
      threadId,
      role: 'system',
      content: '',
      metadata: {
        kind: 'cache_sync_request',
        cacheSyncRequest: {
          pendingFiles,
          sizeBytes,
          choices: [
            { id: 'sync',   label: 'Synchroniser et vider' },
            { id: 'keep',   label: 'Garder en cache' },
            { id: 'discard', label: 'Ignorer les modifications' },
          ],
        },
      },
    });
  } catch (e) {
    console.error('[cache-cleanup] message create failed:', e?.message);
  }
}

/**
 * Single cleanup pass.
 */
async function runCleanupPass() {
  const now = Date.now();
  const all = await AiProjectCache.find({}, '_id threadId workspaceId lastAccessedAt files sticky').lean();
  for (const doc of all) {
    try {
      const thread = await _loadThread(doc.threadId);
      if (!thread) {
        // Orphan cache → wipe
        await cleanupCache({ threadId: doc.threadId, force: true });
        continue;
      }
      const prefs = await _loadPrefs(thread.userId);
      const cacheBehavior = prefs?.cacheBehavior || {};
      const ttlHours = cacheBehavior.idleTtlHours ?? DEFAULT_TTL_HOURS;
      const maxAgeMs = ttlHours * 3600_000;

      const lastAccess = doc.lastAccessedAt ? new Date(doc.lastAccessedAt).getTime() : 0;
      const idle = now - lastAccess;
      if (idle < maxAgeMs) continue;

      if (doc.sticky || cacheBehavior.keepCacheAfterClose) continue;

      const dirty = await listDirty(doc.threadId);

      if (dirty.length) {
        if (cacheBehavior.askBeforeSync) {
          await _emitCacheSyncRequest(
            doc.threadId,
            dirty.map(f => ({ path: f.relativePath, size: f.size, dirty: true })),
            dirty.reduce((s, f) => s + (f.size || 0), 0),
          );
          continue; // wait for user answer
        }
        if (cacheBehavior.autoSyncOnIdle !== false) {
          // Best-effort auto-sync (uploader is a no-op here — real sync happens from project-fs tools context)
          // For the cleanup worker we can only log the pending state; the wipe is skipped.
          console.log(`[cache-cleanup] thread ${doc.threadId}: ${dirty.length} dirty files, no uploader context, skipping wipe`);
          continue;
        }
      }

      if (cacheBehavior.askBeforeCleanup) {
        await _emitCacheSyncRequest(
          doc.threadId,
          [],
          doc.files?.reduce((s, f) => s + (f.size || 0), 0) || 0,
        );
        continue;
      }

      await cleanupCache({ threadId: doc.threadId, force: false, maxAgeMs });
    } catch (e) {
      console.error('[cache-cleanup] per-thread error:', e?.message);
    }
  }
}

/**
 * Start the cleanup worker. Idempotent.
 */
function startCleanupWorker() {
  if (_timer) return;
  const interval = parseCronToInterval(process.env.AI_CACHE_CLEANUP_CRON);
  console.log(`[cache-cleanup] worker starting (interval=${interval}ms)`);
  _timer = setInterval(() => {
    runCleanupPass().catch(e => console.error('[cache-cleanup] pass error:', e?.message));
  }, interval);
  // Fire once shortly after boot
  setTimeout(() => {
    runCleanupPass().catch(e => console.error('[cache-cleanup] initial pass error:', e?.message));
  }, 30_000);
}

function stopCleanupWorker() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}

module.exports = { startCleanupWorker, stopCleanupWorker, runCleanupPass };
