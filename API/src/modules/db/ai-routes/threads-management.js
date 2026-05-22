// Routes /ai/threads/:threadId/* — opérations légères sur un thread.
//
//   POST   /ai/threads/:threadId/regenerate-title    génère un titre via LLM depuis l'historique
//   POST   /ai/threads/:threadId/duplicate           clone le thread + tous ses messages
//   POST   /ai/threads/:threadId/cancel              annule le SSE actif (abort AbortController)
//   POST   /ai/threads/:threadId/mailbox             envoie un message au job en cours
//                                                    (pattern Claude Code : parler pendant que l'agent travaille)
//
// NB : list / get / delete / update / list-messages / send-message / live-stream restent
// dans ai.js pour l'instant (couplés au POST /messages SSE — Sprint 2 cible).

const Workspace = require('../../../db/models/workspace.model');
const AiThread = require('../../../db/models/ai-thread.model');
const AiMessage = require('../../../db/models/ai-message.model');
const AiJob = require('../../../db/models/ai-job.model');
const env = require('../../../config/env');
const { createLlmClient } = require('../../../ai/llm');
const { findThread, activeStreams } = require('./_shared');
const { emitThreadEvent } = require('../../../ai/jobs/job-events');

module.exports = function registerThreadManagementRoutes(r) {
  // ── Regenerate title via LLM ───────────────────────────────────────
  r.post('/ai/threads/:threadId/regenerate-title', async (req, res) => {
    const thread = await findThread(req.params.threadId);
    if (!thread) return res.apiError(404, 'thread_not_found', 'Thread not found');
    const ws = await Workspace.findById(thread.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'thread_not_found', 'Thread not found');

    const messages = await AiMessage.find({ threadId: thread._id }).sort({ createdAt: 1 }).limit(10).lean();
    const summary = messages.map(m => `${m.role}: ${(m.content || '').slice(0, 200)}`).join('\n');

    const llm = createLlmClient(env.AI_PROVIDER, {
      provider: env.AI_PROVIDER,
      apiKey: env.AI_API_KEY,
      model: env.AI_MODEL,
    });

    try {
      let title = '';
      const stream = llm.stream([
        { role: 'system', content: 'Génère un titre court (max 50 caractères) en français pour cette conversation. Réponds UNIQUEMENT avec le titre, sans guillemets ni ponctuation finale.' },
        { role: 'user', content: summary },
      ], [], { maxTokens: 100 });
      for await (const ev of stream) {
        if (ev.type === 'text_delta') title += ev.text;
      }
      title = title.trim().replace(/^["']|["']$/g, '');
      if (!title) title = 'Chat';
      await AiThread.updateOne({ _id: thread._id }, { $set: { title } });
      res.apiOk({ title });
    } catch (e) {
      console.error('[ai] regenerate title error:', e?.message);
      res.apiError(500, 'title_error', 'Failed to generate title');
    }
  });

  // ── Duplicate (clone thread + tous les messages) ───────────────────
  r.post('/ai/threads/:threadId/duplicate', async (req, res) => {
    const thread = await findThread(req.params.threadId);
    if (!thread) return res.apiError(404, 'thread_not_found', 'Thread not found');
    const ws = await Workspace.findById(thread.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'thread_not_found', 'Thread not found');

    const newThread = await AiThread.create({
      companyId: thread.companyId,
      workspaceId: thread.workspaceId,
      userId: req.user.id,
      mode: thread.mode,
      title: (thread.title || 'Chat') + ' (copie)',
      agentId: thread.agentId || undefined,
      flowId: thread.flowId || undefined,
      nodeId: thread.nodeId || undefined,
      metadata: thread.metadata || undefined,
    });

    const messages = await AiMessage.find({ threadId: thread._id }).sort({ createdAt: 1 }).lean();
    if (messages.length) {
      const cloned = messages.map(m => ({
        threadId: newThread._id,
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls,
        segments: m.segments,
        question: m.question,
        attachments: m.attachments,
        answer: m.answer,
      }));
      await AiMessage.insertMany(cloned);
    }

    res.status(201).json({ success: true, data: newThread, requestId: req.requestId, ts: Date.now() });
  });

  // ── Cancel active SSE stream ───────────────────────────────────────
  // Le frontend appelle cette route quand l'user clique "Stop" pendant un stream
  // POST /messages. On récupère l'AbortController dans activeStreams et on abort.
  r.post('/ai/threads/:threadId/cancel', async (req, res) => {
    const thread = await findThread(req.params.threadId);
    if (!thread) return res.apiError(404, 'thread_not_found', 'Thread not found');
    const key = String(thread._id);
    const ac = activeStreams.get(key);
    if (ac) {
      ac.abort();
      activeStreams.delete(key);
      console.log(`[ai] stream cancelled for thread ${key}`);
    }
    res.apiOk({ cancelled: !!ac });
  });

  // ── Mailbox : envoyer un message pendant que l'agent travaille ────
  // Pattern Claude Code. Stockage au niveau THREAD (pas job) → marche pour :
  //   - Agent principal (POST /messages, sans AiJob)
  //   - Sous-agents en cours (qui drainent aussi la thread mailbox)
  //   - Auto-resume parent (le mailbox sera lu quand l'agent reprend)
  //
  // Toujours OK même si aucun job actif — le message est délivré dès qu'un agent
  // commence son prochain tour LLM. Le message visible dans le chat tout de suite.
  r.post('/ai/threads/:threadId/mailbox', async (req, res) => {
    const thread = await findThread(req.params.threadId);
    if (!thread) return res.apiError(404, 'thread_not_found', 'Thread not found');
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.apiError(400, 'empty_message', 'message required');
    }

    const trimmed = String(message).slice(0, 4000);

    // 1. Affiche le message dans le chat (visible immédiatement pour l'user).
    const userMsg = await AiMessage.create({
      threadId: thread._id,
      role: 'user',
      content: trimmed,
      metadata: { kind: 'mailbox', extra: { sentDuringStreaming: true } },
    });

    // 2. Push dans la mailbox THREAD-LEVEL (drainée par le harness au prochain tour).
    await AiThread.updateOne(
      { _id: thread._id },
      {
        $push: {
          pendingMessages: {
            from: 'user',
            fromName: req.user?.name || req.user?.email || 'user',
            message: trimmed,
            createdAt: new Date(),
            delivered: false,
          },
        },
      }
    );

    // 3. Émet l'event SSE avec le AiMessage COMPLET hydraté inline (zéro race,
    //    zéro refetch côté frontend — la bulle apparaît instantanément).
    emitThreadEvent(thread._id, {
      type: 'ai.message.created',
      kind: 'mailbox',
      messageId: String(userMsg._id),
      message: userMsg.toObject ? userMsg.toObject() : userMsg,
    });

    console.log(`[mailbox] message pushed to thread=${thread._id} (will be drained at next harness tour)`);
    res.apiOk({ delivered: true, threadId: String(thread._id), messageId: String(userMsg._id) });
  });
};
