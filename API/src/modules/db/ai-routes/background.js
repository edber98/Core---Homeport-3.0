// Routes background — agent lancé en arrière-plan sans bloquer la connexion SSE.
//
//   POST /ai/threads/:threadId/background    spawn un agent background (fire-and-forget)
//   GET  /ai/runs/:runId                     état d'un AiAgentRun (background)
//
// Le frontend reçoit les events via socket.io ou via le stream live du thread,
// pas via la réponse HTTP (qui résout dès que le spawn est lancé).

const Workspace = require('../../../db/models/workspace.model');
const AiMessage = require('../../../db/models/ai-message.model');
const AiAgentRun = require('../../../db/models/ai-agent-run.model');
const { buildContext } = require('../../../ai/context/context-builder');
const { spawnBackgroundAgent } = require('../../../ai/background-runner');
const { resolveAttachments } = require('../../../ai/attachments');
const { findThread } = require('./_shared');
const { resolveAgentOverrides } = require('./agent-overrides');

/**
 * Convertit un historique AiMessage[] en format LLM messages[].
 * Gère : attachments multimodaux, assistant+tool_calls, messages vides skip.
 */
async function _buildMessagesFromHistory(history, wsId) {
  const messages = [];
  for (const m of history) {
    const hasContent = String(m.content || '').trim().length > 0;

    if (m.role === 'user') {
      if (m.attachments?.length) {
        try {
          const attBlocks = await resolveAttachments(m.attachments, String(wsId));
          if (attBlocks.length) {
            const parts = [];
            if (hasContent) parts.push({ type: 'text', text: m.content });
            parts.push(...attBlocks);
            if (parts.length) messages.push({ role: 'user', content: parts });
          } else if (hasContent) {
            messages.push({ role: 'user', content: m.content });
          }
        } catch {
          if (hasContent) messages.push({ role: 'user', content: m.content });
        }
      } else if (hasContent) {
        messages.push({ role: 'user', content: m.content });
      }
      continue;
    }

    if (m.role === 'assistant') {
      if (m.toolCalls?.length) {
        // Assistant avec tool_calls : content peut être vide (widget-only).
        // On préserve la séquence tool_use/tool_result mais on omet content si vide.
        messages.push({
          role: 'assistant',
          ...(hasContent ? { content: m.content } : {}),
          tool_calls: m.toolCalls.map(tc => ({ id: tc.id, name: tc.name, input: tc.args || {} })),
        });
        for (const tc of m.toolCalls) {
          messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(tc.result || {}).slice(0, 3000) });
        }
      } else if (hasContent) {
        messages.push({ role: 'assistant', content: m.content });
      }
      // Assistant sans content ni toolCalls (message widget pur) → skip entièrement.
    }
  }
  return messages;
}

module.exports = function registerBackgroundRoutes(r) {
  // ── Spawn background agent ─────────────────────────────────────────
  r.post('/ai/threads/:threadId/background', async (req, res) => {
    const thread = await findThread(req.params.threadId);
    if (!thread) return res.apiError(404, 'thread_not_found', 'Thread not found');
    const ws = await Workspace.findById(thread.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'thread_not_found', 'Thread not found');

    const { content, mode, agentId } = req.body || {};
    if (!content) return res.apiError(400, 'empty_content', 'content required');

    // Save user message
    await AiMessage.create({ threadId: thread._id, role: 'user', content });

    // Load history (60 derniers messages)
    const history = await AiMessage.find({ threadId: thread._id }).sort({ createdAt: 1 }).limit(60).lean();
    const messages = await _buildMessagesFromHistory(history, ws._id);

    // Resolve agent overrides (provider:xxx ou aia_xxx)
    let agentOverrides = null;
    const effectiveAgentId = agentId || thread.agentId;
    if (effectiveAgentId) {
      const context = await buildContext({ companyId: ws.companyId, workspaceId: ws._id, userId: req.user.id });
      const resolved = await resolveAgentOverrides(effectiveAgentId, context);
      if (resolved) {
        if (resolved.promptFragment) context._agentPromptFragment = resolved.promptFragment;
        agentOverrides = {
          llmProvider: resolved.llmProvider || null,
          llmModel: resolved.llmModel || null,
          toolGroups: resolved.toolGroups || null,
          blockedTools: resolved.blockedTools || null,
          maxToolLoops: resolved.maxToolLoops || null,
          routerBehavior: resolved.routerBehavior || null,
        };
      }
    }

    // Spawn — fire-and-forget. Le frontend recevra les events via socket.io / thread live stream.
    const io = req.app?.get?.('io');
    const result = await spawnBackgroundAgent({
      threadId: thread._id,
      workspaceId: ws._id,
      companyId: ws.companyId,
      userId: req.user.id,
      mode: mode || thread.mode || 'chat',
      agentId: effectiveAgentId || undefined,
      messages,
      metadata: {
        flowId: thread.flowId || undefined,
        nodeId: thread.nodeId || undefined,
        formId: thread.metadata?.formId || undefined,
        workspaceId: String(ws._id),
      },
      agentOverrides,
      notifySocket: io ? (event, data) => io.to(`ws:${ws._id}`).emit(event, data) : undefined,
    });

    res.apiOk(result);
  });

  // ── État d'un run background ───────────────────────────────────────
  r.get('/ai/runs/:runId', async (req, res) => {
    const run = await AiAgentRun.findOne({ id: req.params.runId }).lean();
    if (!run) return res.apiError(404, 'run_not_found', 'Run not found');
    res.apiOk(run);
  });
};
