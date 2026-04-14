// Permission gate — decides whether to allow / deny / pend on a tool call.
// Combines:
//   1. Tool risk level (from tool-risk.js)
//   2. Autonomy × risk matrix (global default)
//   3. Existing AiPermissionGrant entries (thread-scoped overrides)
//
// Result shape: { decision: 'allow'|'deny'|'pending', risk, reason?, grantId? }

const AiPermissionGrant = require('../../db/models/ai-permission-grant.model');
const { resolveToolRisk } = require('./tool-risk');

/**
 * Autonomy × Risk default decision matrix.
 *   allow   → execute directly
 *   pending → ask user (prompt gate)
 *   deny    → refuse outright (no prompt)
 *
 * autonomous: most permissive, only elevated tools need confirmation
 * balanced: destructive + elevated need confirmation
 * prudent: any write requires confirmation
 */
const MATRIX = {
  autonomous: {
    safe:        'allow',
    write:       'allow',
    destructive: 'pending',
    elevated:    'pending',
  },
  balanced: {
    safe:        'allow',
    write:       'allow',
    destructive: 'pending',
    elevated:    'pending',
  },
  prudent: {
    safe:        'allow',
    write:       'pending',
    destructive: 'pending',
    elevated:    'pending',
  },
};

/**
 * Normalize autonomy level to a known key.
 */
function _normLevel(level) {
  if (level === 'prudent' || level === 'balanced' || level === 'autonomous') return level;
  return 'autonomous';
}

/**
 * Match a stored grant against a tool call.
 * A grant can be path-less (scope='tool') or path-scoped.
 */
function _grantMatches(grant, toolArgs) {
  if (!grant) return false;
  if (grant.scope === 'tool' || grant.scope === 'tool+workspace') return true;
  const path = toolArgs?.path || toolArgs?.from || toolArgs?.paths?.[0];
  if (!path) return grant.scope === 'tool';

  if (grant.scope === 'tool+path') {
    return typeof grant.pathPattern === 'string'
      && (grant.pathPattern === path || path.startsWith(grant.pathPattern));
  }
  if (grant.scope === 'tool+pattern') {
    try {
      const re = new RegExp(grant.pathPattern);
      return re.test(path);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Check if a stored grant is still active (not expired).
 */
function _isActive(grant) {
  if (!grant) return false;
  if (grant.expiresAt && new Date(grant.expiresAt).getTime() < Date.now()) return false;
  return true;
}

/**
 * Check permission for a tool call.
 *
 * @param {object} opts
 * @param {string|ObjectId} opts.threadId
 * @param {string|ObjectId} opts.workspaceId
 * @param {string} [opts.jobId]
 * @param {string} opts.toolName
 * @param {object} opts.toolArgs
 * @param {string} [opts.autonomy] - prudent|balanced|autonomous
 * @param {Map}   [opts.templatesCache]
 * @param {string|ObjectId} [opts.userId]
 * @returns {Promise<{decision:'allow'|'deny'|'pending', risk:string, reason?:string, grantId?:string}>}
 */
async function checkPermission(opts) {
  const {
    threadId, toolName, toolArgs = {},
    autonomy, templatesCache,
  } = opts;

  const risk = resolveToolRisk(toolName, toolArgs, templatesCache);

  // Safe is always allowed (subject to existing deny grants only)
  if (risk === 'safe') {
    // Still check for explicit deny grants
    try {
      const grants = await AiPermissionGrant.find({
        threadId, toolName,
        decision: { $in: ['deny_once', 'deny_always'] },
      }).lean();
      const active = grants.find(g => _isActive(g) && _grantMatches(g, toolArgs));
      if (active) {
        return { decision: 'deny', risk, reason: 'denied_by_grant', grantId: active.id };
      }
    } catch (e) {
      // Safe tools shouldn't fail because of grant lookup errors
      console.error('[permission-gate] safe grant lookup error:', e?.message);
    }
    return { decision: 'allow', risk };
  }

  // Look up all active grants for this thread+tool
  let matching = null;
  try {
    const grants = await AiPermissionGrant.find({ threadId, toolName }).lean();
    matching = grants.find(g => _isActive(g) && _grantMatches(g, toolArgs));
  } catch (e) {
    console.error('[permission-gate] grant lookup error:', e?.message);
  }

  if (matching) {
    const d = matching.decision;
    if (d === 'allow_once' || d === 'allow_session' || d === 'allow_always') {
      // allow_once is consumed on use — caller is responsible for expiring it if needed
      return { decision: 'allow', risk, grantId: matching.id, reason: `granted_${d}` };
    }
    if (d === 'deny_once' || d === 'deny_always') {
      return { decision: 'deny', risk, grantId: matching.id, reason: `denied_${d}` };
    }
  }

  // Apply matrix default
  const level = _normLevel(autonomy);
  const matrixResult = MATRIX[level][risk] || 'pending';

  if (matrixResult === 'allow') return { decision: 'allow', risk, reason: `autonomy_${level}` };
  if (matrixResult === 'deny')  return { decision: 'deny',  risk, reason: `autonomy_${level}` };
  return { decision: 'pending', risk, reason: `autonomy_${level}` };
}

/**
 * Resolve a pending permission request — persists an AiPermissionGrant and
 * notifies the gate consumer (via EventEmitter set on jobContext).
 *
 * @param {object} opts
 * @param {string|ObjectId} opts.threadId
 * @param {string|ObjectId} opts.workspaceId
 * @param {string} opts.toolName
 * @param {string} opts.decision - allow_once|allow_session|allow_always|deny_once|deny_always
 * @param {string} [opts.pathPattern]
 * @param {string} [opts.scope] - tool|tool+path|tool+pattern|tool+workspace
 * @param {string} [opts.risk]
 * @param {string|ObjectId} opts.userId
 * @param {string} [opts.jobId]
 * @param {number} [opts.ttlMs]
 * @returns {Promise<{ok:true, grant:object}>}
 */
async function resolvePendingDecision(opts) {
  const {
    threadId, workspaceId, toolName,
    decision, pathPattern = '', scope,
    risk, userId, jobId, ttlMs,
  } = opts;

  if (!threadId || !toolName || !decision) {
    throw new Error('resolvePendingDecision: missing required fields');
  }

  const finalScope = scope || (pathPattern ? 'tool+path' : 'tool');
  const expiresAt = ttlMs ? new Date(Date.now() + ttlMs) : undefined;

  // Upsert by (threadId, toolName, pathPattern, scope)
  const grant = await AiPermissionGrant.findOneAndUpdate(
    { threadId, toolName, pathPattern, scope: finalScope },
    {
      $set: {
        workspaceId,
        jobId: jobId || undefined,
        decision,
        riskLevel: risk || 'write',
        decidedBy: userId || undefined,
        decidedAt: new Date(),
        expiresAt,
        ttl: ttlMs,
      },
      $setOnInsert: { threadId, toolName, pathPattern, scope: finalScope },
    },
    { upsert: true, new: true }
  );

  return { ok: true, grant };
}

module.exports = {
  checkPermission,
  resolvePendingDecision,
  MATRIX,
};
