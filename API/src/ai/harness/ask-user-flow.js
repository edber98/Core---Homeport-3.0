// ask_user flow — escalade subagent → parent + visibilité user, OU pause classique main.
//
// Le tool `ask_user` permet à l'agent (principal OU sous-agent) de poser une
// question à l'utilisateur. Comportement différent selon le contexte :
//
//   - AGENT PRINCIPAL : on yield un event `question`, l'utilisateur répond via
//     l'UI standard, et le harness reprend après la réponse.
//
//   - SOUS-AGENT : la question est escaladée au parent via job-events. En
//     parallèle, on crée un AiMessage visible dans le chat user pour qu'il
//     puisse répondre directement. Premier qui répond gagne.
//     → Évite le cas "parent silencieux qui n'écoute plus" et donne à l'user
//       la possibilité de reprendre la main.
//
// Le module est un async generator : caller `yield* handleAskUser(...)`.
// Retourne { handled: 'subagent_escalated' | 'main_question' | 'none' } pour
// indiquer au caller comment continuer.

const crypto = require('crypto');

const ASK_USER_TIMEOUT_MS = 10 * 60_000;

/**
 * Gère un tour LLM contenant un appel à `ask_user`.
 *
 * Pour SUBAGENT : escalade puis injecte la réponse dans conversation, l'appelant
 * doit faire `continue` pour relancer la boucle LLM.
 *
 * Pour MAIN agent : yield question + done, l'appelant doit faire `return`.
 *
 * @yields events SSE (question, done, ai.message.created)
 * @returns {Promise<{ kind: 'continue' | 'return' | 'none' }>}
 */
async function* handleAskUser(opts) {
  const {
    pendingToolCalls,
    toolResults,
    jobContext,
    context,
    modeMetadata,
    conversation,
    toolSet,
    log,
    totalUsage,
    loopCount,
    assistantText,
  } = opts;

  const askUserCall = pendingToolCalls.find(tc => tc.name === 'ask_user');
  if (!askUserCall) return { kind: 'none' };

  const askResult = toolResults.find(r => r.id === askUserCall.id);
  const parentJobId = jobContext?.parentJobId ? String(jobContext.parentJobId) : null;

  // ── SOUS-AGENT : escalade au parent + carte user ──
  if (parentJobId && askResult?.result) {
    yield* _escalateAskUserToParent({
      askUserCall, askResult, parentJobId, jobContext, modeMetadata, context,
      conversation, pendingToolCalls, toolResults, loopCount, assistantText, log,
    });
    return { kind: 'continue' };
  }

  // ── AGENT PRINCIPAL : pause classique sur la question ──
  await toolSet.cleanup();
  if (askResult?.result) {
    const qEvent = { type: 'question', ...askResult.result };
    if (askResult.result.questions) qEvent.questions = askResult.result.questions;
    yield qEvent;
  }
  yield { type: 'done', usage: totalUsage };
  return { kind: 'return' };
}

async function* _escalateAskUserToParent({
  askUserCall, askResult, parentJobId, jobContext, modeMetadata, context,
  conversation, pendingToolCalls, toolResults, loopCount, assistantText, log,
}) {
  const { emitJobEvent, emitThreadEvent, waitForAskUserFromParent } = require('../jobs/job-events');
  const requestId = crypto.randomUUID();
  const threadId = modeMetadata.threadId || context._threadId;

  // 1. Notifie le parent via job-events
  emitJobEvent(parentJobId, {
    type: 'subagent.ask_user.request',
    requestId,
    childJobId: jobContext.jobId,
    question: askResult.result.text || '',
    options: askResult.result.options || [],
    questionType: askResult.result.questionType || 'text',
    questions: askResult.result.questions || null,
  });
  jobContext.broadcast?.({
    type: 'subagent.ask_user.request',
    requestId, childJobId: jobContext.jobId, parentJobId,
    question: askResult.result.text || '',
  });

  // 2. Crée un AiMessage avec question dans le chat user
  if (threadId) {
    try {
      const AiMessage = require('../../db/models/ai-message.model');
      const msg = await AiMessage.create({
        threadId,
        role: 'assistant',
        content: askResult.result.text || 'Question du sous-agent',
        question: {
          text: askResult.result.text || '',
          questionType: askResult.result.questionType || 'text',
          options: askResult.result.options || [],
          questions: askResult.result.questions || null,
        },
        metadata: {
          extra: {
            subagentQuestion: true,
            requestId, parentJobId, childJobId: jobContext.jobId,
          },
        },
      });
      // messageId inclus → emitThreadEvent auto-hydrate avec le message complet
      emitThreadEvent(String(threadId), {
        type: 'ai.message.created',
        kind: 'subagent_question',
        messageId: String(msg._id),
      });
      const AiJob = require('../../db/models/ai-job.model');
      await AiJob.updateOne({ id: jobContext.jobId }, { $set: { status: 'waiting_permission' } });
      emitThreadEvent(String(threadId), {
        type: 'canvas.task.update',
        taskId: jobContext.jobId,
        status: 'waiting_permission',
        pendingPermission: { requestId, toolName: 'ask_user', risk: 'safe' },
      });
    } catch (e) {
      log?.error?.('subagent ask_user UI promote failed:', e?.message);
    }
  }

  // 3. Attente réponse (parent OU user)
  const { answer, source } = await waitForAskUserFromParent(parentJobId, requestId, ASK_USER_TIMEOUT_MS);

  // 4. Restore running status
  if (threadId) {
    try {
      const AiJob = require('../../db/models/ai-job.model');
      await AiJob.updateOne({ id: jobContext.jobId }, { $set: { status: 'running' } });
      emitThreadEvent(String(threadId), {
        type: 'canvas.task.update', taskId: jobContext.jobId, status: 'running',
      });
    } catch {}
  }

  // 5. Réinjecte la réponse comme tool_result pour relancer la boucle subagent
  const answerPayload = {
    ok: true,
    answer: answer == null ? '(pas de réponse — timeout ou non-bloquant)' : answer,
    source: source || 'parent_auto',
  };
  conversation.push({
    role: 'assistant',
    content: assistantText || null,
    tool_calls: pendingToolCalls.map(tc => ({ id: tc.id, name: tc.name, input: tc.input })),
  });
  for (const tr of toolResults) {
    if (tr.id === askUserCall.id) continue;
    conversation.push({ role: 'tool', tool_call_id: tr.id, content: tr.content });
  }
  conversation.push({
    role: 'tool',
    tool_call_id: askUserCall.id,
    content: JSON.stringify(answerPayload),
  });
  try { await jobContext.persistCheckpoint(loopCount, conversation); } catch {}
}

module.exports = { handleAskUser };
