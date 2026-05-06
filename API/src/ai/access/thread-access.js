// Thread access control — unified permission check for AiThread.
//
// Access levels (ascending):
//   view    → read thread, messages, canvas, files (no mutations)
//   comment → add "comment" messages
//   edit    → post user messages, trigger runs, modify metadata
//   admin   → manage shares, delete thread, edit settings
//
// Rules:
//   - ownerId always has 'admin'
//   - user in sharedWith[].permission maps: view→view, comment→comment, edit→edit
//   - workspace admin role (User.role === 'admin') implicitly gets 'admin'
//   - visibility 'private' + not shared + not owner → no access

const { Types } = require('mongoose');
const AiThread = require('../../db/models/ai-thread.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');

const LEVEL_RANK = { view: 0, comment: 1, edit: 2, admin: 3 };

function _rank(level) {
  return LEVEL_RANK[level] ?? -1;
}

async function _loadThread(threadId) {
  const id = String(threadId);
  if (Types.ObjectId.isValid(id)) {
    const t = await AiThread.findById(id).lean();
    if (t) return t;
  }
  return AiThread.findOne({ id }).lean();
}

/**
 * Check access. Returns the user's effective level or null if no access.
 * @param {string|ObjectId} userId
 * @param {string|ObjectId} threadId
 * @returns {Promise<'view'|'comment'|'edit'|'admin'|null>}
 */
async function resolveThreadLevel(userId, threadId) {
  if (!userId || !threadId) return null;
  const thread = await _loadThread(threadId);
  if (!thread) return null;

  const uid = String(userId);
  // Owner
  if (String(thread.ownerId || thread.userId) === uid) return 'admin';

  // Explicit share
  const share = (thread.sharedWith || []).find(s => String(s.userId) === uid);
  if (share) {
    if (share.permission === 'view') return 'view';
    if (share.permission === 'comment') return 'comment';
    if (share.permission === 'edit') return 'edit';
  }

  // Workspace admin role
  try {
    const member = await WorkspaceMembership.findOne({
      userId: uid,
      workspaceId: thread.workspaceId,
    }).lean();
    if (member && (member.role === 'admin' || member.role === 'owner')) return 'admin';
  } catch { /* ignore */ }

  return null;
}

/**
 * Boolean access check against a required level.
 * @param {string|ObjectId} userId
 * @param {string|ObjectId} threadId
 * @param {'view'|'comment'|'edit'|'admin'} requiredLevel
 * @returns {Promise<boolean>}
 */
async function canAccessThread(userId, threadId, requiredLevel = 'view') {
  const level = await resolveThreadLevel(userId, threadId);
  if (!level) return false;
  return _rank(level) >= _rank(requiredLevel);
}

/**
 * Express middleware factory — rejects the request if the authenticated user
 * does not have the required level on the `threadId` route param.
 *
 * Attaches `req.aiThread` (lean doc) and `req.aiThreadLevel` for downstream use.
 */
function requireThreadAccess(requiredLevel = 'view') {
  return async function threadAccessMiddleware(req, res, next) {
    try {
      const threadId = req.params.threadId;
      const userId = req.user?.id;
      if (!threadId) return res.apiError(400, 'missing_thread', 'threadId required');
      if (!userId)   return res.apiError(401, 'unauthenticated', 'Authentication required');

      const thread = await _loadThread(threadId);
      if (!thread) return res.apiError(404, 'thread_not_found', 'Thread not found');

      const level = await resolveThreadLevel(userId, thread._id);
      if (!level) return res.apiError(403, 'thread_access_denied', 'No access to this thread');
      if (_rank(level) < _rank(requiredLevel)) {
        return res.apiError(403, 'thread_access_denied', `Required level: ${requiredLevel} (have: ${level})`);
      }

      req.aiThread = thread;
      req.aiThreadLevel = level;
      next();
    } catch (e) {
      console.error('[thread-access] middleware error:', e?.message);
      res.apiError(500, 'access_error', 'Failed to check thread access');
    }
  };
}

module.exports = {
  canAccessThread,
  resolveThreadLevel,
  requireThreadAccess,
  LEVEL_RANK,
};
