// Project cache — per-thread local mirror of a remote filesystem connector.
//
// Layout:
//   <AI_CACHE_ROOT>/<workspaceId>/<threadId>/
//     mirror/    → read-only downloaded copies of remote files (clean)
//     scratch/   → modified files awaiting remote sync (dirty)
//
// The AI can freely read mirror/. When it writes, we copy mirror → scratch and
// mark the file dirty in the AiProjectCache model. A sync flushes scratch → remote
// and moves files back to mirror/.

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const AiProjectCache = require('../../db/models/ai-project-cache.model');

const DEFAULT_ROOT = '/tmp/homeport-cache';

function cacheBase() {
  return process.env.AI_CACHE_ROOT || DEFAULT_ROOT;
}

/**
 * Resolve (and create if needed) the per-thread cache root directory.
 * @returns {Promise<string>} absolute path
 */
async function getCacheRoot(workspaceId, threadId) {
  const root = path.resolve(cacheBase(), String(workspaceId), String(threadId));
  await fsp.mkdir(path.join(root, 'mirror'), { recursive: true });
  await fsp.mkdir(path.join(root, 'scratch'), { recursive: true });
  return root;
}

/**
 * Validate a relative path stays inside the cache root.
 * Throws on traversal attempts.
 * @returns {string} absolute path under cacheRoot
 */
function validatePath(cacheRoot, relativePath) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error('validatePath: relativePath required');
  }
  // Normalize and strip leading slashes
  const clean = relativePath.replace(/^[\\/]+/, '');
  const abs = path.resolve(cacheRoot, clean);
  const rootResolved = path.resolve(cacheRoot);
  if (abs !== rootResolved && !abs.startsWith(rootResolved + path.sep)) {
    throw new Error(`validatePath: path escapes cacheRoot (${relativePath})`);
  }
  return abs;
}

/**
 * Compute the mirror and scratch absolute paths for a relative entry.
 */
function _locPaths(cacheRoot, relativePath) {
  const clean = relativePath.replace(/^[\\/]+/, '');
  return {
    mirror:  validatePath(cacheRoot, path.join('mirror', clean)),
    scratch: validatePath(cacheRoot, path.join('scratch', clean)),
  };
}

async function _sha256(absPath) {
  const h = crypto.createHash('sha256');
  const stream = fs.createReadStream(absPath);
  for await (const chunk of stream) h.update(chunk);
  return h.digest('hex');
}

/**
 * Ensure a file is locally present. If missing in scratch/ and mirror/, invoke
 * the downloader (async fn) which must write the file at the returned absolute
 * path. Returns the path that should be read (scratch/ takes precedence over
 * mirror/).
 *
 * @param {object} opts
 * @param {string} opts.cacheRoot
 * @param {string} opts.threadId
 * @param {string} opts.workspaceId
 * @param {string} opts.relativePath
 * @param {function(absPath):Promise<{size?:number, contentType?:string, etag?:string, mtime?:Date}>} opts.downloader
 * @returns {Promise<{path:string, fromCache:boolean}>}
 */
async function ensureFileLocal(opts) {
  const { cacheRoot, threadId, workspaceId, relativePath, downloader } = opts;
  const { mirror: mirrorAbs, scratch: scratchAbs } = _locPaths(cacheRoot, relativePath);

  // scratch wins if dirty
  try {
    await fsp.access(scratchAbs);
    await touchAccess(threadId);
    return { path: scratchAbs, fromCache: true };
  } catch { /* not in scratch */ }

  try {
    await fsp.access(mirrorAbs);
    await touchAccess(threadId);
    return { path: mirrorAbs, fromCache: true };
  } catch { /* need to download */ }

  // Download into mirror/
  await fsp.mkdir(path.dirname(mirrorAbs), { recursive: true });
  const meta = (await downloader(mirrorAbs)) || {};
  const stat = await fsp.stat(mirrorAbs);
  const sha = await _sha256(mirrorAbs).catch(() => null);

  await AiProjectCache.updateOne(
    { threadId },
    {
      $setOnInsert: { threadId, workspaceId, cacheRoot },
      $set: { lastAccessedAt: new Date() },
      $inc: { sizeBytes: stat.size },
      $pull: { files: { relativePath } },
    },
    { upsert: true }
  );
  await AiProjectCache.updateOne(
    { threadId },
    {
      $push: {
        files: {
          relativePath,
          sha256: sha,
          size: stat.size,
          contentType: meta.contentType || null,
          downloadedAt: new Date(),
          dirty: false,
          remoteEtag: meta.etag || null,
          remoteMtime: meta.mtime || null,
        },
      },
    }
  );

  return { path: mirrorAbs, fromCache: false };
}

/**
 * Mark a file dirty (stored in scratch/) in the AiProjectCache.
 * Caller is responsible for writing the actual bytes to scratch/<relativePath>.
 */
async function markDirty(opts) {
  const { cacheRoot, threadId, workspaceId, relativePath } = opts;
  const { scratch } = _locPaths(cacheRoot, relativePath);
  let size = 0;
  try { size = (await fsp.stat(scratch)).size; } catch { /* zero */ }

  await AiProjectCache.updateOne(
    { threadId },
    {
      $setOnInsert: { threadId, workspaceId, cacheRoot },
      $pull: { files: { relativePath } },
    },
    { upsert: true }
  );
  await AiProjectCache.updateOne(
    { threadId },
    {
      $push: {
        files: {
          relativePath,
          size,
          dirty: true,
          downloadedAt: new Date(),
        },
      },
      $set: { lastAccessedAt: new Date() },
    }
  );
}

/**
 * List dirty files for a thread.
 * @returns {Promise<Array<{relativePath, size}>>}
 */
async function listDirty(threadId) {
  const doc = await AiProjectCache.findOne({ threadId }).lean();
  if (!doc?.files?.length) return [];
  return doc.files.filter(f => f.dirty);
}

/**
 * Sync dirty files to the remote using the provided uploader.
 * On successful upload, move scratch → mirror, clear dirty flag.
 *
 * @param {object} opts
 * @param {string} opts.cacheRoot
 * @param {string} opts.threadId
 * @param {function(relativePath:string, absPath:string):Promise<{etag?:string,mtime?:Date}>} opts.uploader
 * @returns {Promise<{synced:number, errors:Array}>}
 */
async function syncDirtyToRemote(opts) {
  const { cacheRoot, threadId, uploader } = opts;
  const dirty = await listDirty(threadId);
  const errors = [];
  let synced = 0;

  for (const f of dirty) {
    const { mirror: mirrorAbs, scratch: scratchAbs } = _locPaths(cacheRoot, f.relativePath);
    try {
      await fsp.access(scratchAbs);
    } catch {
      // Scratch gone but flagged dirty — skip and clean up
      await AiProjectCache.updateOne(
        { threadId },
        { $pull: { files: { relativePath: f.relativePath } } }
      );
      continue;
    }
    try {
      const meta = (await uploader(f.relativePath, scratchAbs)) || {};
      // Move scratch → mirror
      await fsp.mkdir(path.dirname(mirrorAbs), { recursive: true });
      await fsp.rename(scratchAbs, mirrorAbs);
      await AiProjectCache.updateOne(
        { threadId, 'files.relativePath': f.relativePath },
        {
          $set: {
            'files.$.dirty': false,
            'files.$.syncedAt': new Date(),
            'files.$.remoteEtag': meta.etag || null,
            'files.$.remoteMtime': meta.mtime || null,
          },
        }
      );
      synced++;
    } catch (e) {
      errors.push({ relativePath: f.relativePath, error: e?.message || String(e) });
    }
  }
  return { synced, errors };
}

/**
 * Update lastAccessedAt for TTL tracking.
 */
async function touchAccess(threadId) {
  try {
    await AiProjectCache.updateOne({ threadId }, { $set: { lastAccessedAt: new Date() } });
  } catch { /* non-fatal */ }
}

/**
 * Clean up a thread's cache.
 * @param {object} opts
 * @param {string} opts.threadId
 * @param {boolean} [opts.force=false] - wipe even if dirty
 * @param {number}  [opts.maxAgeMs]     - only if older than this
 * @returns {Promise<{wiped:boolean, reason?:string}>}
 */
async function cleanupCache(opts) {
  const { threadId, force = false, maxAgeMs } = opts;
  const doc = await AiProjectCache.findOne({ threadId }).lean();
  if (!doc) return { wiped: false, reason: 'no_cache' };

  if (!force) {
    const hasDirty = (doc.files || []).some(f => f.dirty);
    if (hasDirty) return { wiped: false, reason: 'dirty_files_present' };

    if (maxAgeMs) {
      const age = Date.now() - new Date(doc.lastAccessedAt || doc.createdAt || 0).getTime();
      if (age < maxAgeMs) return { wiped: false, reason: 'still_fresh' };
    }

    if (doc.sticky) return { wiped: false, reason: 'sticky' };
  }

  try {
    if (doc.cacheRoot) {
      await fsp.rm(doc.cacheRoot, { recursive: true, force: true });
    }
  } catch (e) {
    console.error('[project-cache] cleanup rm failed:', e?.message);
  }
  await AiProjectCache.deleteOne({ threadId });
  return { wiped: true };
}

module.exports = {
  getCacheRoot,
  validatePath,
  ensureFileLocal,
  markDirty,
  listDirty,
  syncDirtyToRemote,
  cleanupCache,
  touchAccess,
  _locPaths,
};
