// Permission flow — gate, escalade parent/user, attente résolution.
//
// 3 chemins possibles selon le contexte :
//
//   1. AGENT PRINCIPAL (pas de parentJobId) :
//      Crée un AiMessage permission_request dans le chat + emit thread event.
//      L'user voit la card, répond → waitForPermission résout.
//      Timeout 5min.
//
//   2. SOUS-AGENT (parentJobId présent) :
//      Escalade DOUBLE : notifie le parent (qui peut auto-décider via
//      subagent.permission.granted) ET crée une card user dans le thread.
//      Premier qui répond gagne.
//      Mécanique :
//        - Phase 1 : user-first window 30s (waitForPermission seul).
//        - Phase 2 si timeout : race(waitForPermissionFromParent, waitForPermission)
//          pour 10min max.
//      → Évite le cas "parent silencieux" qui timeoutait à 5min sans escalade user.
//
//   3. NO jobContext (legacy onboarding) :
//      Auto-allow avec warning. Pas de mécanisme d'attente possible.
//
// Le module est un async generator : caller `yield* handlePermissionGate(...)`
// pour forwarder les events. La valeur de retour indique si on doit skip le tool.

const crypto = require('crypto');
const { checkPermission } = require('../permissions');
const { resolveToolLabel, summarizeArgs } = require('./tool-label');
const { buildBlockedResult } = require('./anti-hallucination');

const SUBAGENT_USER_FIRST_WINDOW_MS = 60_000;
const SUBAGENT_ESCALATION_TIMEOUT_MS = 15 * 60_000;
// Allongé à 30min : avant à 5min → si user prenait son temps pour répondre,
// la permission résolvait "deny" silencieusement et l'agent voyait
// permission_denied alors que l'user était en train de cliquer "Toujours autorisé".
const MAIN_AGENT_PERMISSION_TIMEOUT_MS = 30 * 60_000;

/**
 * Gère un tool call à travers le permission gate.
 * Caller doit faire `yield* handlePermissionGate(...)` et lire la valeur de
 * retour pour décider de skip ou exécuter le tool.
 *
 * @yields events SSE (tool.end, ai.permission.request)
 * @returns {Promise<{ shouldSkipTool: boolean, blockResult?: any }>}
 *   - shouldSkipTool: true si denied/blocked/timeout → caller doit `continue`
 *   - blockResult: présent si shouldSkipTool, déjà yieldé en tool.end, déjà push dans toolResults
 */
async function* handlePermissionGate(opts) {
  const {
    toolCall: tc,
    jobContext,
    context,
    modeMetadata,
    log,
    blockedFinalizerIds,
    toolResults,
  } = opts;

  // ── Anti-hallucination : finalizer bloqué (cf. anti-hallucination.js) ──
  if (blockedFinalizerIds.has(tc.id)) {
    const blockResult = buildBlockedResult(tc.name);
    toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(blockResult), status: 'error', duration: 0 });
    yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result: blockResult, status: 'error', duration: 0 };
    return { shouldSkipTool: true };
  }

  // ── Check permission ──
  let permCheck = { decision: 'allow', risk: 'safe' };
  try {
    permCheck = await checkPermission({
      threadId: modeMetadata.threadId || context._threadId,
      workspaceId: modeMetadata.workspaceId,
      jobId: jobContext?.jobId,
      toolName: tc.name,
      toolArgs: tc.input || {},
      autonomy: context._autonomyLevel || 'autonomous',
      userId: context.userId,
    });
  } catch (permErr) {
    // Si le gate lui-même crash, on default à allow (legacy).
    log?.error?.('permission check error:', permErr?.message);
  }

  if (permCheck.decision === 'allow') {
    return { shouldSkipTool: false };
  }

  if (permCheck.decision === 'deny') {
    const denyResult = { ok: false, error: 'permission_denied', reason: permCheck.reason, risk: permCheck.risk };
    toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(denyResult), status: 'error', duration: 0 });
    yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result: denyResult, status: 'error', duration: 0 };
    return { shouldSkipTool: true };
  }

  // ── decision === 'pending' ──
  if (!jobContext) {
    // Legacy onboarding sans jobContext : pas de mécanisme d'attente → auto-allow.
    log?.warn?.(`permission pending for ${tc.name} but no jobContext — auto-allowing (legacy)`);
    return { shouldSkipTool: false };
  }

  const requestId = crypto.randomUUID();
  const argsPreview = summarizeArgs(tc.input);
  const parentJobId = jobContext.parentJobId ? String(jobContext.parentJobId) : null;
  const threadId = modeMetadata.threadId || context._threadId;

  // ── Chemin 2 : SOUS-AGENT (escalade parent + user) ──
  if (parentJobId) {
    const resolved = yield* _escalateSubagentPermission({
      requestId, argsPreview, parentJobId, threadId,
      toolCall: tc, permCheck, jobContext, log,
    });
    if (resolved !== 'allow') {
      const denyResult = { ok: false, error: 'permission_denied', reason: 'denied', risk: permCheck.risk };
      toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(denyResult), status: 'error', duration: 0 });
      yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result: denyResult, status: 'error', duration: 0 };
      return { shouldSkipTool: true };
    }
    return { shouldSkipTool: false };
  }

  // ── Chemin 1 : AGENT PRINCIPAL (UI card user) ──
  const resolved = yield* _requestMainAgentPermission({
    requestId, argsPreview, threadId, toolCall: tc, permCheck, jobContext,
  });
  if (resolved !== 'allow') {
    const denyResult = { ok: false, error: 'permission_denied', reason: 'user_denied', risk: permCheck.risk };
    toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(denyResult), status: 'error', duration: 0 });
    yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result: denyResult, status: 'error', duration: 0 };
    return { shouldSkipTool: true };
  }
  return { shouldSkipTool: false };
}

// ─────────────────────────────────────────────────────────────────────────
// Escalade SOUS-AGENT : notifie parent + crée card user + race les 2 sources
// ─────────────────────────────────────────────────────────────────────────
async function* _escalateSubagentPermission({
  requestId, argsPreview, parentJobId, threadId, toolCall, permCheck, jobContext, log,
}) {
  const { emitJobEvent, emitThreadEvent, waitForPermissionFromParent, waitForPermission } = require('../jobs/job-events');

  // 1. Notifie le parent (il peut auto-décider via subagent.permission.granted)
  emitJobEvent(parentJobId, {
    type: 'subagent.permission.request',
    requestId,
    childJobId: jobContext.jobId,
    toolName: toolCall.name,
    argsPreview,
    risk: permCheck.risk,
  });
  jobContext.broadcast?.({
    type: 'subagent.permission.request',
    requestId, toolName: toolCall.name, risk: permCheck.risk,
    argsPreview, childJobId: jobContext.jobId, parentJobId,
  });

  // 2. Promotion à l'user : crée AiMessage permission_request dans le chat
  if (threadId) {
    try {
      const AiMessage = require('../../db/models/ai-message.model');
      let subAgentInfo = {};
      try {
        const { getAgent } = require('../subagent/roster');
        const info = jobContext.subagentType ? getAgent(jobContext.subagentType) : null;
        if (info) subAgentInfo = {
          subagentType: jobContext.subagentType,
          agentName: info.name,
          agentEmoji: info.emoji,
          agentColor: info.color,
          agentTagline: info.tagline,
          agentFigure: info.figure || undefined,
        };
      } catch {}
      const subLabel = subAgentInfo.agentName
        ? `${subAgentInfo.agentEmoji || '🤖'} ${subAgentInfo.agentName}`
        : 'Sous-agent';
      const toolLabel = await resolveToolLabel(toolCall.name, toolCall.input);
      const msg = await AiMessage.create({
        threadId,
        role: 'assistant',
        content: `${subLabel} demande la permission d'exécuter ${toolLabel}`,
        metadata: {
          kind: 'permission_request',
          permissionRequest: {
            requestId, toolName: toolCall.name, toolLabel, argsPreview,
            risk: permCheck.risk, childJobId: jobContext.jobId, parentJobId,
            escalatedFromSubagent: true,
            ...subAgentInfo,
          },
          extra: { ...subAgentInfo },
        },
      });
      emitThreadEvent(String(threadId), {
        type: 'ai.permission.request',
        requestId, toolName: toolCall.name, toolLabel, risk: permCheck.risk,
        argsPreview, childJobId: jobContext.jobId, parentJobId,
        escalatedFromSubagent: true,
      });
      // messageId inclus → auto-hydrate avec le message complet (event self-suffisant)
      emitThreadEvent(String(threadId), {
        type: 'ai.message.created',
        kind: 'permission_request',
        messageId: String(msg._id),
      });
    } catch (e) {
      log?.error?.('subagent permission UI promote failed:', e?.message);
    }
  }

  // 3. Marque le subagent en waiting_permission (UI canvas + DB)
  try {
    const AiJob = require('../../db/models/ai-job.model');
    await AiJob.updateOne({ id: jobContext.jobId }, { $set: { status: 'waiting_permission' } });
    if (threadId) {
      emitThreadEvent(String(threadId), {
        type: 'canvas.task.update',
        taskId: jobContext.jobId,
        status: 'waiting_permission',
        pendingPermission: { requestId, toolName: toolCall.name, risk: permCheck.risk },
      });
    }
  } catch { /* non-fatal */ }

  // 4. Attente résolution. Phase 1 : user 30s prioritaire.
  let resolved;
  try {
    resolved = await Promise.race([
      waitForPermission(jobContext.jobId, requestId, SUBAGENT_USER_FIRST_WINDOW_MS),
      new Promise(r => setTimeout(() => r('__user_timeout__'), SUBAGENT_USER_FIRST_WINDOW_MS)),
    ]);
  } catch { resolved = '__user_timeout__'; }

  // Phase 2 : si user n'a pas répondu, on race parent + user pour 10min.
  if (resolved === '__user_timeout__') {
    log?.log?.(`permission: user didn't respond in ${SUBAGENT_USER_FIRST_WINDOW_MS}ms → fallback on parent agent + user (race)`);
    const fromParent = waitForPermissionFromParent(parentJobId, requestId, SUBAGENT_ESCALATION_TIMEOUT_MS);
    const fromUser = waitForPermission(jobContext.jobId, requestId, SUBAGENT_ESCALATION_TIMEOUT_MS);
    resolved = await Promise.race([fromParent, fromUser]);
  }

  // 5. Repasse en running (avant le tool exec ou le deny)
  try {
    const AiJob = require('../../db/models/ai-job.model');
    await AiJob.updateOne({ id: jobContext.jobId }, { $set: { status: 'running' } });
    if (threadId) {
      emitThreadEvent(String(threadId), {
        type: 'canvas.task.update',
        taskId: jobContext.jobId,
        status: 'running',
      });
    }
  } catch { /* non-fatal */ }

  return resolved;
}

// ─────────────────────────────────────────────────────────────────────────
// Demande AGENT PRINCIPAL : UI card user + wait
// ─────────────────────────────────────────────────────────────────────────
async function* _requestMainAgentPermission({
  requestId, argsPreview, threadId, toolCall, permCheck, jobContext,
}) {
  if (threadId) {
    try {
      const AiMessage = require('../../db/models/ai-message.model');
      let agentInfo = {};
      try {
        const { getAgent } = require('../subagent/roster');
        const subType = jobContext.subagentType;
        const info = subType ? getAgent(subType) : null;
        if (info) {
          agentInfo = {
            subagentType: subType,
            agentName: info.name,
            agentEmoji: info.emoji,
            agentColor: info.color,
            agentTagline: info.tagline,
            agentFigure: info.figure || undefined,
          };
        } else if (subType) {
          // subagentType présent mais pas dans le roster → on envoie quand même
          // pour que le frontend puisse afficher "🤖 <subType>" au lieu de "Agent"
          agentInfo = { subagentType: subType };
        }
      } catch {}
      const AiJob = require('../../db/models/ai-job.model');
      let jobSubject = '';
      try {
        const j = await AiJob.findOne({ id: jobContext.jobId }, 'subagentInstructions').lean();
        jobSubject = j?.subagentInstructions ? String(j.subagentInstructions).slice(0, 200) : '';
      } catch {}
      const agentLabel = agentInfo.agentName
        ? `${agentInfo.agentEmoji || '🤖'} ${agentInfo.agentName}`
        : 'Agent';
      const toolLabel = await resolveToolLabel(toolCall.name, toolCall.input);
      const msg = await AiMessage.create({
        threadId,
        role: 'assistant',
        content: `${agentLabel} demande la permission d'exécuter ${toolLabel}`,
        metadata: {
          kind: 'permission_request',
          permissionRequest: {
            requestId, toolName: toolCall.name, toolLabel, argsPreview,
            risk: permCheck.risk, childJobId: jobContext.jobId,
            ...agentInfo,
          },
          jobId: jobContext.jobId,
          extra: {
            jobSubject: jobSubject || undefined,
            ...agentInfo,
          },
        },
      });
      const { emitThreadEvent } = require('../jobs/job-events');
      emitThreadEvent(String(threadId), {
        type: 'ai.permission.request',
        requestId, toolName: toolCall.name, toolLabel, risk: permCheck.risk,
        argsPreview, jobId: jobContext.jobId,
      });
      // messageId inclus → auto-hydrate avec le message complet
      emitThreadEvent(String(threadId), {
        type: 'ai.message.created',
        kind: 'permission_request',
        messageId: String(msg._id),
      });
    } catch (e) {
      console.error('[permission-flow] UI create failed:', e?.message);
    }
  }
  yield {
    type: 'ai.permission.request',
    requestId,
    toolName: toolCall.name,
    argsPreview,
    risk: permCheck.risk,
  };
  jobContext.broadcast?.({
    type: 'ai.permission.request',
    requestId, toolName: toolCall.name, risk: permCheck.risk,
    argsPreview,
  });
  // Passe threadId pour que le timeout puisse marquer la card UI comme expirée.
  return await jobContext.waitForPermission(requestId, MAIN_AGENT_PERMISSION_TIMEOUT_MS, { threadId });
}

module.exports = { handlePermissionGate };
