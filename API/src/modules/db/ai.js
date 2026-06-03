// Unified AI routes — threads, messages (SSE), context, tools, agents
const express = require('express');
const { Types } = require('mongoose');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const AiThread = require('../../db/models/ai-thread.model');
const AiMessage = require('../../db/models/ai-message.model');
const AiCompanyContext = require('../../db/models/ai-company-context.model');
const AiWorkspaceContext = require('../../db/models/ai-workspace-context.model');
const AiUserContext = require('../../db/models/ai-user-context.model');
const AiAgent = require('../../db/models/ai-agent.model');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const Flow = require('../../db/models/flow.model');
const { isDebug } = require('../../ai/util/debug');
const { buildContext } = require('../../ai/context/context-builder');
const { runAgent } = require('../../ai/agent-runner');
const { runHarness } = require('../../ai/agent-harness');
const { toolIndex } = require('../../ai/tools/tool-index');
const { resolveAgentOverrides } = require('./ai-routes/agent-overrides');
const { activeStreams, findThread, ensureWorkspaceAccess } = require('./ai-routes/_shared');

module.exports = function () {
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  // ══════════════════════════════
  //  THREADS
  // ══════════════════════════════

  // List threads (workspace-scoped)
  r.get('/ai/threads', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const pageRaw = Number(req.query.page);
    const limitRaw = Number(req.query.limit);
    const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 50;

    const filter = { workspaceId: ws._id };
    if (req.query.mode) filter.mode = req.query.mode;
    if (req.query.flowId) {
      // Resolve short ID (flw_xxx) to ObjectId if needed
      const fid = req.query.flowId;
      if (Types.ObjectId.isValid(fid)) {
        filter.flowId = fid;
      } else {
        const flow = await Flow.findOne({ id: fid }, '_id').lean();
        if (flow) filter.flowId = flow._id;
        else filter.flowId = null; // no match
      }
    }
    if (req.query.formId) filter['metadata.formId'] = req.query.formId;
    // Include threads shared with the current user
    const sharedClause = {
      workspaceId: ws._id,
      'sharedWith.userId': req.user.id,
      ...(filter.mode ? { mode: filter.mode } : {}),
      ...(filter.flowId !== undefined ? { flowId: filter.flowId } : {}),
    };
    const list = await AiThread.find({ $or: [filter, sharedClause] })
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    // Tag threads the current user doesn't own as _shared:true
    const uid = String(req.user.id);
    const tagged = list.map(t => {
      const ownerId = String(t.ownerId || t.userId || '');
      return ownerId !== uid ? { ...t, _shared: true } : t;
    });
    res.apiOk(tagged);
  });

  // Create thread
  r.post('/ai/threads', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const { mode, title, flowId, formId, nodeId, agentId, metadata } = req.body || {};
    // Resolve flowId: could be a short ID (flw_xxx) or an ObjectId string
    let resolvedFlowId;
    if (flowId) {
      if (Types.ObjectId.isValid(flowId)) {
        resolvedFlowId = flowId;
      } else {
        const flow = await Flow.findOne({ id: flowId }, '_id').lean();
        resolvedFlowId = flow ? flow._id : undefined;
      }
    }
    // Build metadata — merge explicit formId into metadata
    const threadMeta = { ...(metadata || {}) };
    if (formId) threadMeta.formId = formId;
    const thread = await AiThread.create({
      companyId: ws.companyId,
      workspaceId: ws._id,
      userId: req.user.id,
      mode: mode || 'chat',
      title: title || 'Chat',
      flowId: resolvedFlowId,
      nodeId: nodeId || undefined,
      agentId: agentId || undefined,
      metadata: Object.keys(threadMeta).length ? threadMeta : undefined,
    });
    res.status(201).json({ success: true, data: thread, requestId: req.requestId, ts: Date.now() });
  });

  // Get thread + last messages
  r.get('/ai/threads/:threadId', async (req, res) => {
    const thread = await findThread(req.params.threadId);
    if (!thread) return res.apiError(404, 'thread_not_found', 'Thread not found');
    // Verify access
    const ws = await Workspace.findById(thread.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'thread_not_found', 'Thread not found');
    const messages = await AiMessage.find({ threadId: thread._id }).sort({ createdAt: 1 }).limit(100).lean();
    res.apiOk({ thread, messages });
  });

  // Delete thread
  r.delete('/ai/threads/:threadId', async (req, res) => {
    const thread = await findThread(req.params.threadId);
    if (!thread) return res.apiError(404, 'thread_not_found', 'Thread not found');
    const ws = await Workspace.findById(thread.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'thread_not_found', 'Thread not found');
    const tid = thread._id;
    // Lazy require (cascades peuvent tourner avant que modèles soient référencés plus bas)
    const AiProjectRoot = require('../../db/models/ai-project-root.model');
    const AiProjectCache = require('../../db/models/ai-project-cache.model');
    const AiCanvasState = require('../../db/models/ai-canvas-state.model');
    const AiJob = require('../../db/models/ai-job.model');
    const AiJobTask = require('../../db/models/ai-job-task.model');
    const AiPermissionGrant = require('../../db/models/ai-permission-grant.model');
    const fsp = require('fs/promises');
    // Récupère le cacheRoot avant suppression pour rm -rf
    const cache = await AiProjectCache.findOne({ threadId: tid }, 'cacheRoot').lean();
    const jobs = await AiJob.find({ threadId: tid }, '_id').lean();
    const jobIds = jobs.map(j => j._id);
    await Promise.all([
      AiMessage.deleteMany({ threadId: tid }),
      AiProjectRoot.deleteOne({ threadId: tid }),
      AiProjectCache.deleteOne({ threadId: tid }),
      AiCanvasState.deleteOne({ threadId: tid }),
      AiPermissionGrant.deleteMany({ threadId: tid }),
      AiJobTask.deleteMany({ jobId: { $in: jobIds } }),
      AiJob.deleteMany({ threadId: tid }),
    ]);
    // Purge cache disque (best-effort)
    if (cache?.cacheRoot) {
      try { await fsp.rm(cache.cacheRoot, { recursive: true, force: true }); } catch {}
    }
    await AiThread.deleteOne({ _id: tid });
    res.apiOk(true);
  });

  // Regenerate thread title using LLM
  // Routes /ai/threads/:threadId/regenerate-title, /duplicate, /cancel (cf. ai-routes/threads-management.js)
  require('./ai-routes/threads-management')(r);

  // SSE master : 1 seul stream par thread (replay via Last-Event-ID).
  // Remplace progressivement POST /messages SSE + GET /stream legacy (cf. ai-routes/stream-master.js)
  require('./ai-routes/stream-master')(r);


  // Update thread (title, agentId, mode, metadata)
  r.put('/ai/threads/:threadId', async (req, res) => {
    const thread = await findThread(req.params.threadId);
    if (!thread) return res.apiError(404, 'thread_not_found', 'Thread not found');
    const ws = await Workspace.findById(thread.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'thread_not_found', 'Thread not found');

    const { title, agentId, mode, metadata } = req.body || {};
    const update = { updatedAt: new Date() };
    if (title !== undefined) update.title = title;
    if (agentId !== undefined) update.agentId = agentId || null;
    if (mode !== undefined) update.mode = mode;
    if (metadata !== undefined) {
      for (const [k, v] of Object.entries(metadata)) {
        update[`metadata.${k}`] = v;
      }
    }
    await AiThread.updateOne({ _id: thread._id }, { $set: update });
    const updated = await AiThread.findById(thread._id).lean();
    res.apiOk(updated);
  });

  // ══════════════════════════════
  //  MESSAGES + SSE STREAMING
  // ══════════════════════════════

  // Get message history
  r.get('/ai/threads/:threadId/messages', async (req, res) => {
    const thread = await findThread(req.params.threadId);
    if (!thread) return res.apiError(404, 'thread_not_found', 'Thread not found');
    const ws = await Workspace.findById(thread.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'thread_not_found', 'Thread not found');
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const skip = (page - 1) * limit;
    const messages = await AiMessage.find({ threadId: thread._id }).sort({ createdAt: 1 }).skip(skip).limit(limit).lean();
    res.apiOk(messages);
  });

  // Send message → SSE stream
  r.post('/ai/threads/:threadId/messages', async (req, res) => {
    const thread = await findThread(req.params.threadId);
    if (!thread) return res.apiError(404, 'thread_not_found', 'Thread not found');
    const ws = await Workspace.findById(thread.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'thread_not_found', 'Thread not found');

    const { content, answer, attachments, graph, schema } = req.body || {};
    if (!content && !answer) return res.apiError(400, 'empty_message', 'content or answer required');

    // Save user message
    await AiMessage.create({
      threadId: thread._id,
      role: 'user',
      content: content || '',
      attachments: attachments || undefined,
      answer: answer || undefined,
    });

    // Update thread timestamp
    await AiThread.updateOne({ _id: thread._id }, { $set: { updatedAt: new Date() } });

    // Load conversation history (including tool calls for LLM context)
    // ── Load + trim conversation history to fit context window ──
    const history = await AiMessage.find({ threadId: thread._id }).sort({ createdAt: 1 }).limit(60).lean();
    const MAX_TOOL_RESULT_CHARS = 3000; // Truncate large tool results
    const TOKEN_BUDGET = 80000;         // ~80K tokens budget for messages (leave room for system prompt + tools)

    /** Rough token estimate: 1 token ≈ 4 chars */
    const estimateCharsToTokens = (chars) => Math.ceil(chars / 4);

    const { resolveAttachments, estimateAttachmentTokens } = require('../../ai/attachments');
    const wsId = String(ws._id);

    // Build all messages first — on omet les messages à content VIDE (widgets
    // purs, system_notes, etc.) pour éviter l'erreur Anthropic "text content
    // blocks must be non-empty".
    const allMessages = [];
    for (const m of history) {
      if (m.role === 'user') {
        let content = m.content || '';
        if (!content && m.answer) {
          const v = m.answer.value || {};
          if (typeof v === 'object' && v.text) {
            content = `Réponse à "${m.answer.questionText || 'la question'}": ${v.text}`;
          } else if (typeof v === 'object' && v.values) {
            content = `Réponses à "${m.answer.questionText || 'la question'}": ${v.values.join(', ')}`;
          } else if (typeof v === 'object' && v.batchAnswers) {
            const parts = Object.entries(v.batchAnswers).map(([k, val]) => `${k}: ${JSON.stringify(val)}`);
            content = `Réponses aux questions:\n${parts.join('\n')}`;
          } else if (typeof v === 'object' && v.label) {
            content = `Réponse à "${m.answer.questionText || 'la question'}": ${v.label}`;
          } else {
            content = `Réponse à "${m.answer.questionText || 'la question'}": ${JSON.stringify(v)}`;
          }
        }
        const hasText = String(content).trim().length > 0;
        if (m.attachments?.length) {
          try {
            const attBlocks = await resolveAttachments(m.attachments, wsId);
            if (attBlocks.length) {
              const parts = [];
              if (hasText) parts.push({ type: 'text', text: content });
              parts.push(...attBlocks);
              if (parts.length) {
                allMessages.push({ role: 'user', content: parts.length === 1 && parts[0].type === 'text' ? content : parts, _attTokens: estimateAttachmentTokens(attBlocks) });
              }
            } else if (hasText) {
              allMessages.push({ role: 'user', content });
            }
          } catch (e) {
            console.error('[ai] attachment resolve error:', e?.message);
            if (hasText) allMessages.push({ role: 'user', content });
          }
        } else if (hasText) {
          allMessages.push({ role: 'user', content });
        }
      } else if (m.role === 'assistant') {
        const hasText = String(m.content || '').trim().length > 0;
        if (m.toolCalls?.length) {
          allMessages.push({
            role: 'assistant',
            ...(hasText ? { content: m.content } : {}),
            tool_calls: m.toolCalls.map(tc => ({ id: tc.id, name: tc.name, input: tc.args || {} })),
          });
          for (const tc of m.toolCalls) {
            let resultStr = typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result || {});
            if (resultStr.length > MAX_TOOL_RESULT_CHARS) {
              resultStr = resultStr.slice(0, MAX_TOOL_RESULT_CHARS) + '... [tronqué]';
            }
            allMessages.push({ role: 'tool', tool_call_id: tc.id, content: resultStr });
          }
        } else if (hasText) {
          allMessages.push({ role: 'assistant', content: m.content });
        }
        // Assistant widget-only sans toolCalls → skip (pas de contenu utile pour LLM).
      } else if (String(m.content || '').trim().length > 0) {
        allMessages.push({ role: m.role, content: m.content });
      }
    }

    // Trim from the front (oldest) if exceeding token budget — always keep most recent messages
    let messages = allMessages;
    /** Estimate tokens for a single message */
    const msgTokens = (m) => {
      let chars = 0;
      if (Array.isArray(m.content)) {
        // Multimodal content array
        for (const b of m.content) {
          if (b.type === 'image') chars += 1600 * 4; // ~1600 tokens → chars equivalent
          else chars += (b.text || '').length;
        }
      } else {
        chars = (m.content || '').length;
      }
      if (m.tool_calls) chars += JSON.stringify(m.tool_calls).length;
      return estimateCharsToTokens(chars);
    };

    let totalTokens = allMessages.reduce((sum, m) => sum + msgTokens(m), 0);

    if (totalTokens > TOKEN_BUDGET) {
      // Keep the last N messages that fit within budget, always keep at least the last 10
      messages = [];
      let budget = TOKEN_BUDGET;
      for (let i = allMessages.length - 1; i >= 0; i--) {
        const m = allMessages[i];
        const tokens = msgTokens(m);
        if (budget - tokens < 0 && messages.length >= 10) break;
        budget -= tokens;
        messages.unshift(m);
      }
      console.log(`[ai] trimmed history: ${allMessages.length} → ${messages.length} messages (budget: ${TOKEN_BUDGET} tokens)`);
    }

    // Strip old image attachments to save tokens — keep only last 3 messages with full images
    let imgMsgCount = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!Array.isArray(m.content)) continue;
      const hasImage = m.content.some(b => b.type === 'image');
      if (!hasImage) continue;
      imgMsgCount++;
      if (imgMsgCount > 3) {
        // Replace image blocks with text placeholders
        m.content = m.content.map(b => {
          if (b.type === 'image') return { type: 'text', text: `[Image précédemment jointe: ${b.name || 'image'}]` };
          return b;
        });
      }
    }

    // Build context
    let context;
    try {
      context = await buildContext({
        companyId: ws.companyId,
        workspaceId: ws._id,
        userId: req.user.id,
      });
    } catch (e) {
      console.error('[ai] context build error', e?.message || e);
      return res.apiError(500, 'context_error', 'Failed to build AI context');
    }

    // Load project memory if thread is linked to a flow/form
    try {
      const AiProjectMemory = require('../../db/models/ai-project-memory.model');
      let pmType, pmId;
      if (thread.flowId) { pmType = 'flow'; pmId = String(thread.flowId); }
      else if (thread.metadata?.formId) { pmType = 'form'; pmId = String(thread.metadata.formId); }
      if (pmType && pmId) {
        const pmDoc = await AiProjectMemory.findOne({ workspaceId: ws._id, elementType: pmType, elementId: pmId }).lean();
        if (pmDoc?.memory && Object.keys(pmDoc.memory).length) {
          context._projectMemory = pmDoc.memory;
        }
      }
    } catch (e) {
      console.error('[ai] project memory load error:', e?.message);
    }

    // Load structured project knowledge (key/value) scoped to thread
    try {
      const AiProjectKnowledge = require('../../db/models/ai-project-knowledge.model');
      const kDoc = await AiProjectKnowledge.findOne({ threadId: thread._id }).lean();
      if (kDoc?.entries?.length) {
        context._projectKnowledge = kDoc.entries;
      }
    } catch (e) {
      console.error('[ai] project knowledge load error:', e?.message);
    }

    // Expose source thread agentId so compact_and_transfer can inherit it
    context._sourceThreadAgentId = thread.agentId || undefined;

    // Load agent overrides if agentId is set (dynamic provider or custom)
    let agentOverrides = null;
    let resolvedAgent = null;
    if (thread.agentId) {
      resolvedAgent = await resolveAgentOverrides(thread.agentId, context);
      if (resolvedAgent) {
        // Inject prompt fragment into context for buildSystemPrompt
        if (resolvedAgent.promptFragment) {
          context._agentPromptFragment = resolvedAgent.promptFragment;
        }
        // Pass LLM overrides and access control if custom agent specifies them
        if (resolvedAgent.llmProvider || resolvedAgent.llmModel || resolvedAgent.toolGroups || resolvedAgent.blockedTools || resolvedAgent.maxToolLoops || resolvedAgent.routerBehavior) {
          agentOverrides = {
            llmProvider: resolvedAgent.llmProvider || null,
            llmModel: resolvedAgent.llmModel || null,
            toolGroups: resolvedAgent.toolGroups || null,
            blockedTools: resolvedAgent.blockedTools || null,
            maxToolLoops: resolvedAgent.maxToolLoops || null,
            routerBehavior: resolvedAgent.routerBehavior || null,
          };
        }
      }
    }

    // Resolve autonomy level: thread override > agent setting > default
    context._autonomyLevel = thread.metadata?.autonomyLevel
      || resolvedAgent?.autonomyLevel
      || 'autonomous';

    // ── Architecture "app neuve" : POST → 202 Accepted ───────────────
    // Plus de SSE en réponse ici. Tous les events de l'agent passent par
    // emitThreadEvent → SSE master (GET /threads/:id/live).
    //
    // Pattern :
    //   1. On retourne 202 dès que le message user est sauvé
    //   2. Le harness tourne en background via setImmediate
    //   3. Chaque event est émis sur le bus, /live le reçoit instantanément
    //   4. Au close de la requête (jamais ici puisqu'on retourne tout de suite),
    //      le harness est annulé via le AbortController stocké dans activeStreams
    const ac = new AbortController();
    const threadKey = String(thread._id);
    activeStreams.set(threadKey, ac);

    // Helper : émet un event sur le bus thread (visible par /live SSE master).
    // Remplace l'ancien res.write SSE direct.
    const { emitThreadEvent } = require('../../ai/jobs/job-events');
    const send = (obj) => emitThreadEvent(thread._id, obj);

    // 202 Accepted : la requête est acceptée, l'agent va tourner en background.
    // Le frontend doit consommer /api/ai/threads/:id/live pour recevoir les events.
    res.status(202).json({
      accepted: true,
      threadId: String(thread._id),
      hint: 'Subscribe to /api/ai/threads/:id/live for events',
      requestId: req.requestId,
      ts: Date.now(),
    });

    // Build metadata from thread for mode-specific tools.
    // Précédence graph : body (unsaved live) > thread.metadata.graph > Flow DB doc.
    // Le 3ème cas couvre les threads attachés à un flow (via attach_thread_to_flow)
    // utilisés depuis /ai/ait_xxx où le frontend n'envoie pas de graph en body.
    let resolvedGraph = graph || thread.metadata?.graph || undefined;
    if (!resolvedGraph && thread.flowId) {
      try {
        const flowDoc = await Flow.findById(thread.flowId).select('graph').lean();
        if (flowDoc?.graph) resolvedGraph = flowDoc.graph;
      } catch (e) { /* best effort */ }
    }
    let resolvedSchema = schema || thread.metadata?.schema || undefined;
    if (!resolvedSchema && thread.metadata?.formId) {
      try {
        const Form = require('../../db/models/form.model');
        const formDoc = await Form.findById(thread.metadata.formId).select('schema').lean();
        if (formDoc?.schema) resolvedSchema = formDoc.schema;
      } catch (e) { /* best effort */ }
    }
    const metadata = {
      flowId: thread.flowId || undefined,
      nodeId: thread.nodeId || undefined,
      formId: thread.metadata?.formId || undefined,
      branch: thread.metadata?.branch || undefined,
      graph: resolvedGraph,
      schema: resolvedSchema,
      workspaceId: String(ws._id),
      threadId: String(thread._id),
      companyId: req.user?.companyId ? String(req.user.companyId) : undefined,
      userId: req.user?.id ? String(req.user.id) : undefined,
    };

    try {
      let fullText = '';
      const toolCalls = [];
      const segments = []; // Interleaved [{type:'text',content}, {type:'tools',toolCalls:[]}]
      let questionData = null;
      let usageData = null;

      const generator = runHarness({
        mode: thread.mode || 'chat',
        messages,
        context,
        metadata,
        agentOverrides,
        signal: ac.signal,
      });

      for await (const event of generator) {
        if (ac.signal.aborted) break;

        switch (event.type) {
          case 'message': {
            fullText += event.text || '';
            // Accumulate into current text segment
            let lastSeg = segments[segments.length - 1];
            if (!lastSeg || lastSeg.type !== 'text') {
              lastSeg = { type: 'text', content: '' };
              segments.push(lastSeg);
            }
            lastSeg.content += event.text || '';
            send(event);
            break;
          }

          case 'tool.start': {
            if (isDebug()) console.log(`[ai-sse] tool.start → ${event.name} (id=${event.id})`);
            // Ensure we have a tools segment
            let lastSeg = segments[segments.length - 1];
            if (!lastSeg || lastSeg.type !== 'tools') {
              lastSeg = { type: 'tools', toolCalls: [] };
              segments.push(lastSeg);
            }
            // Add placeholder for this tool
            lastSeg.toolCalls.push({ id: event.id, name: event.name, status: 'running' });
            send(event);
            break;
          }

          case 'tool.input_delta':
            if (isDebug()) console.log(`[ai-sse] tool.input_delta → ${event.name} +${(event.text || '').length}chars (id=${event.id})`);
            send(event);
            break;

          case 'tool.meta': {
            console.log(`[ai-sse] tool.meta → "${event.displayTitle}", argsSchema=${event.argsSchema?.length || 0} fields (id=${event.id})`);
            for (const seg of segments) {
              if (seg.type !== 'tools' || !seg.toolCalls) continue;
              const idx = seg.toolCalls.findIndex(t => t.id === event.id);
              if (idx >= 0) {
                seg.toolCalls[idx].displayTitle = event.displayTitle;
                if (event.argsSchema) seg.toolCalls[idx].argsSchema = event.argsSchema;
                break;
              }
            }
            send(event);
            break;
          }

          case 'tool.building_done':
            send(event);
            break;

          case 'tool.end': {
            // Recover argsSchema from tool.meta (stored on placeholder in segment)
            let argsSchema;
            for (const seg of segments) {
              if (seg.type !== 'tools' || !seg.toolCalls) continue;
              const placeholder = seg.toolCalls.find(t => t.id === event.id);
              if (placeholder?.argsSchema) { argsSchema = placeholder.argsSchema; break; }
            }
            const tc = { id: event.id, name: event.name, args: event.args, result: event.result, duration: event.duration, status: event.status, displayTitle: event.displayTitle, argsSchema };
            toolCalls.push(tc);
            // Update the tool in its tools segment
            let tcFound = false;
            for (const seg of segments) {
              if (seg.type !== 'tools' || !seg.toolCalls) continue;
              const idx = seg.toolCalls.findIndex(t => t.id === event.id);
              if (idx >= 0) { seg.toolCalls[idx] = tc; tcFound = true; break; }
            }
            // Fallback: if tool.start didn't create a segment entry, add it now
            if (!tcFound) {
              let lastSeg = segments[segments.length - 1];
              if (!lastSeg || lastSeg.type !== 'tools') {
                lastSeg = { type: 'tools', toolCalls: [] };
                segments.push(lastSeg);
              }
              lastSeg.toolCalls.push(tc);
            }
            send(event);
            // Detect thread transfer (compact_and_transfer tool)
            if (event.name === 'compact_and_transfer' && event.result?._transfer) {
              send({ type: 'thread.transfer', threadId: event.result.threadId, title: event.result.title, mode: event.result.mode });
            }
            break;
          }

          case 'question':
            questionData = event;
            send(event);
            break;

          // Thread link event: update thread mode and link to flow/form
          case 'thread.link': {
            const linkUpdate = { mode: event.mode, updatedAt: new Date() };
            if (event.flowId) linkUpdate.flowId = event.flowId;
            if (event.formId) linkUpdate['metadata.formId'] = event.formId;
            // Store short IDs in metadata for frontend navigation
            if (event.flowShortId) linkUpdate['metadata.flowShortId'] = event.flowShortId;
            if (event.formShortId) linkUpdate['metadata.formShortId'] = event.formShortId;
            await AiThread.updateOne({ _id: thread._id }, { $set: linkUpdate });
            // Reload thread locally
            thread.mode = event.mode;
            if (event.flowId) thread.flowId = event.flowId;
            if (!thread.metadata) thread.metadata = {};
            if (event.formId) thread.metadata.formId = event.formId;
            if (event.flowShortId) thread.metadata.flowShortId = event.flowShortId;
            if (event.formShortId) thread.metadata.formShortId = event.formShortId;
            // Notify frontend of mode/link update (use short IDs for navigation)
            send({ type: 'thread.update', mode: event.mode, flowId: event.flowShortId || event.flowId, formId: event.formShortId || event.formId });
            break;
          }

          // Side events from mode-specific tools (patches, args, etc.)
          case 'patch':
          case 'snapshot':
          case 'args':
          case 'desc':
            send(event);
            break;

          // ── Canvas research step (incrémental : push/update une étape par ID) ──
          case 'canvas.research.step': {
            try {
              const AiCanvasState = require('../../db/models/ai-canvas-state.model');
              const threadId = thread._id;
              const stepId = event.id || `${Date.now()}`;
              const stepData = {
                id: stepId,
                type: event.stepType || event.type_ || 'step',
                status: event.status || 'running',
                title: event.title || event.url || '',
                url: event.url || null,
                query: event.query || null,
                snippet: event.snippet || null,
                resultPreview: event.resultPreview || null,
                error: event.error || null,
                updatedAt: new Date(),
              };
              // pull ancien step avec ce ID puis push le nouveau (upsert atomique)
              await AiCanvasState.updateOne(
                { threadId },
                {
                  $pull: { 'research.steps': { id: stepId } },
                  $setOnInsert: { threadId },
                },
                { upsert: true }
              );
              await AiCanvasState.updateOne(
                { threadId },
                {
                  $push: { 'research.steps': { $each: [stepData], $slice: -200 } },
                  $set: { 'research.lastUpdatedAt': new Date() },
                }
              );
            } catch (e) {
              console.error('[ai-sse] research step persist:', e?.message);
            }
            send(event);
            break;
          }

          // ── Canvas task events (sous-agents live) — upsert tasks[] ──
          case 'canvas.task.create': {
            try {
              const AiCanvasState = require('../../db/models/ai-canvas-state.model');
              const threadId = thread._id;
              const task = event.task || {};
              if (task.id) {
                await AiCanvasState.updateOne(
                  { threadId },
                  { $pull: { tasks: { id: task.id } }, $setOnInsert: { threadId } },
                  { upsert: true }
                );
                await AiCanvasState.updateOne(
                  { threadId },
                  {
                    $push: {
                      tasks: {
                        $each: [{
                          id: task.id,
                          jobId: task.jobId || task.id,
                          subject: task.subject || '',
                          description: task.prompt || task.description || '',
                          subagentType: task.subagentType,
                          status: task.status || 'queued',
                          parentTaskId: task.parentJobId || task.parentTaskId,
                          startedAt: task.startedAt ? new Date(task.startedAt) : new Date(),
                          toolCalls: [],
                        }],
                        $slice: -200,
                      },
                    },
                  }
                );
              }
            } catch (e) { console.error('[ai-sse] canvas.task.create:', e?.message); }
            send(event);
            break;
          }
          case 'canvas.task.update': {
            try {
              const AiCanvasState = require('../../db/models/ai-canvas-state.model');
              const threadId = thread._id;
              const taskId = event.taskId;
              if (taskId) {
                const set = {};
                if (event.status) set['tasks.$.status'] = event.status;
                if (event.duration != null) set['tasks.$.duration'] = event.duration;
                if (event.error) set['tasks.$.error'] = event.error;
                if (event.status === 'completed' || event.status === 'error' || event.status === 'done') {
                  set['tasks.$.finishedAt'] = new Date();
                }
                if (Object.keys(set).length) {
                  await AiCanvasState.updateOne(
                    { threadId, 'tasks.id': taskId },
                    { $set: set }
                  );
                }
              }
            } catch (e) { console.error('[ai-sse] canvas.task.update:', e?.message); }
            send(event);
            break;
          }
          case 'canvas.task.toolcall': {
            try {
              const AiCanvasState = require('../../db/models/ai-canvas-state.model');
              const threadId = thread._id;
              const taskId = event.taskId;
              if (taskId) {
                const entry = {
                  id: `${taskId}_${Date.now()}`,
                  name: event.toolName || 'tool',
                  status: event.status || 'success',
                  duration: event.duration,
                  argsSummary: event.argsSummary,
                  resultSummary: event.resultSummary,
                  at: event.at ? new Date(event.at) : new Date(),
                };
                await AiCanvasState.updateOne(
                  { threadId, 'tasks.id': taskId },
                  { $push: { 'tasks.$.toolCalls': { $each: [entry], $slice: -100 } } }
                );
              }
            } catch (e) { console.error('[ai-sse] canvas.task.toolcall:', e?.message); }
            send(event);
            break;
          }

          // ── Canvas updates — persist to AiCanvasState ──
          case 'canvas.document':
          case 'canvas.research':
          case 'canvas.tasks':
          case 'canvas.files.tree':
          case 'canvas.tab': {
            try {
              const AiCanvasState = require('../../db/models/ai-canvas-state.model');
              const threadId = thread._id;
              const set = {};
              if (event.type === 'canvas.document' && event.document) set.document = event.document;
              if (event.type === 'canvas.research' && event.research) set.research = event.research;
              if (event.type === 'canvas.tasks' && Array.isArray(event.tasks)) set.tasks = event.tasks;
              if (event.type === 'canvas.files.tree') {
                set['files.lastRefreshedAt'] = new Date();
                if (event.tree) set['files.tree'] = event.tree;
                if (event.rootLabel) set['files.rootLabel'] = event.rootLabel;
              }
              if (event.type === 'canvas.tab' && event.activeTab) set.activeTab = event.activeTab;
              if (Object.keys(set).length) {
                await AiCanvasState.updateOne(
                  { threadId },
                  { $set: set, $setOnInsert: { threadId } },
                  { upsert: true }
                );
              }
            } catch (e) {
              console.error('[ai-sse] canvas persist error:', e?.message);
            }
            send(event);
            break;
          }

          // Permission request event — forward to client
          case 'ai.permission.request':
            send(event);
            break;

          case 'done':
            // Capture token usage from agent
            if (event.usage) usageData = event.usage;
            // Don't send done here — will be sent in finally block
            // after message save + title generation, so thread.title arrives before done
            break;

          default:
            // Forward any unknown event type
            send(event);
            break;
        }
      }

      // Save assistant message with interleaved segments
      let savedAssistantMessage = null;
      if (fullText || toolCalls.length) {
        // Clean empty segments
        const cleanSegments = segments.filter(s =>
          (s.type === 'text' && s.content?.trim()) || (s.type === 'tools' && s.toolCalls?.length)
        );
        savedAssistantMessage = await AiMessage.create({
          threadId: thread._id,
          role: 'assistant',
          content: fullText,
          toolCalls: toolCalls.length ? toolCalls : undefined,
          segments: cleanSegments.length ? cleanSegments : undefined,
          question: questionData ? { text: questionData.text, questionType: questionData.questionType, options: questionData.options, questions: questionData.questions } : undefined,
          cancelled: ac.signal.aborted || undefined,
          usage: usageData && (usageData.input || usageData.output) ? usageData : undefined,
        });
        // ⚠️ CRITIQUE : émettre ai.message.created APRÈS la persistance, AVANT le done.
        // Sinon le frontend reset ses segments de streaming à 'done' sans avoir reçu
        // le message final → blank jusqu'au prochain refresh.
        // L'event est auto-hydraté par emitThreadEvent → frontend l'applique direct au store.
        send({
          type: 'ai.message.created',
          kind: 'assistant',
          messageId: String(savedAssistantMessage._id),
        });
      }

      // ── Hook: détection auto de mémoire projet (subagent async) ──
      // N'est actif que pour les threads mode='project'. Le hook gère son
      // propre debounce et ne throw jamais.
      if (thread.mode === 'project' && savedAssistantMessage) {
        try {
          const { triggerMemoryExtractor } = require('../../ai/memory-extractor-hook');
          setImmediate(() => {
            triggerMemoryExtractor({
              thread,
              user: req.user,
              lastAssistantMessageId: savedAssistantMessage._id,
            }).catch((e) => console.error('[ai] memory extractor trigger failed:', e?.message));
          });
        } catch (e) {
          console.error('[ai] memory extractor hook require failed:', e?.message);
        }

        // ── Hook: auto-documentation projet (subagent async, debounce 5 min) ──
        // Maintient l'entrée spéciale `doc.overview` dans la mémoire projet.
        try {
          const { triggerProjectDocWriter } = require('../../ai/project-doc-writer-hook');
          setImmediate(() => {
            triggerProjectDocWriter({
              thread,
              user: req.user,
              lastAssistantMessageId: savedAssistantMessage._id,
            }).catch((e) => console.error('[ai] project doc writer trigger failed:', e?.message));
          });
        } catch (e) {
          console.error('[ai] project doc writer hook require failed:', e?.message);
        }
      }

      // Auto-generate thread title from first user message
      if (thread.title === 'Chat' && content) {
        const short = content.length > 50
          ? content.slice(0, 47).replace(/\n/g, ' ').trim() + '...'
          : content.replace(/\n/g, ' ').trim();
        const title = short.charAt(0).toUpperCase() + short.slice(1);
        await AiThread.updateOne({ _id: thread._id }, { $set: { title } });
        // Notify frontend of title update
        send({ type: 'thread.title', title });
      }
    } catch (e) {
      console.error('[ai] agent error', e?.message || e);
      send({ type: 'error', code: 'agent_error', message: e?.message || 'Internal error' });
    } finally {
      activeStreams.delete(threadKey);
      // Émet l'event done sur le bus pour que /live SSE master notifie le frontend
      send({ type: 'done' });
      // La response HTTP est déjà fermée (202 Accepted) — pas de res.end() à faire ici.
    }
  });


  // Routes /ai/context/* + /ai/project-memory/* (cf. ai-routes/context.js)
  require('./ai-routes/context')(r);

  // Routes /ai/tools/* (cf. ai-routes/tools.js)
  require('./ai-routes/tools')(r);

  // ══════════════════════════════
  //  AGENTS
  // ══════════════════════════════

  // Routes /ai/agents/* (cf. ai-routes/agents.js)
  require('./ai-routes/agents')(r);

  // Route /ai/stats (cf. ai-routes/stats.js)
  require('./ai-routes/stats')(r);

  // Routes background + runs (cf. ai-routes/background.js)
  require('./ai-routes/background')(r);


  // Routes /ai/mcp-servers/* (cf. ai-routes/mcp.js)
  require('./ai-routes/mcp')(r);

  // ══════════════════════════════
  //  JOBS
  // ══════════════════════════════

  const AiJob = require('../../db/models/ai-job.model');
  const { requireThreadAccess } = require('../../ai/access/thread-access');

  // Routes /ai/jobs/* (cf. ai-routes/jobs.js)
  require('./ai-routes/jobs')(r);

  // ---- Legacy /ai/jobs block remplacé par ai-routes/jobs.js — début du code à supprimer ----

  // Liste les fichiers partagés/générés dans le thread :
  // - attachments (user uploads) via AiMessage.attachments[]
  // - producedFiles IA via tool_call results (_files)
  r.get('/ai/threads/:threadId/files', requireThreadAccess('view'), async (req, res) => {
    try {
      const thread = req.aiThread;
      const FileRecord = require('../../db/models/file.model');
      const msgs = await AiMessage.find({ threadId: thread._id }, 'attachments tool_calls metadata createdAt role').sort({ createdAt: 1 }).lean();
      const fileMap = new Map(); // id → { id, name, mimeType, size, createdAt, origin }
      for (const m of msgs) {
        // User uploads
        if (Array.isArray(m.attachments)) {
          for (const att of m.attachments) {
            const fid = att.fileId || att.id;
            if (!fid) continue;
            if (!fileMap.has(fid)) {
              fileMap.set(fid, {
                id: fid,
                name: att.name || att.filename || fid,
                mimeType: att.mimeType || att.contentType || 'application/octet-stream',
                size: att.size || 0,
                createdAt: m.createdAt,
                origin: m.role === 'user' ? 'upload' : 'ai',
              });
            }
          }
        }
        // AI produced files (dans tool_calls[].result._files ou metadata.imageInline.fileId)
        const scanFiles = (obj) => {
          if (!obj || typeof obj !== 'object') return;
          if (Array.isArray(obj._files)) {
            for (const f of obj._files) {
              const fid = f.fileId || f.id;
              if (fid && !fileMap.has(fid)) {
                fileMap.set(fid, {
                  id: fid,
                  name: f.name || fid,
                  mimeType: f.mimeType || 'application/octet-stream',
                  size: f.size || 0,
                  createdAt: m.createdAt,
                  origin: 'ai',
                });
              }
            }
          }
          if (Array.isArray(obj.producedFiles)) {
            for (const f of obj.producedFiles) {
              const fid = f.fileId || f.id;
              if (fid && !fileMap.has(fid)) {
                fileMap.set(fid, {
                  id: fid,
                  name: f.name || (f.path && f.path.split('/').pop()) || fid,
                  mimeType: f.mimeType || 'application/octet-stream',
                  size: f.size || 0,
                  createdAt: m.createdAt,
                  origin: 'ai',
                });
              }
            }
          }
        };
        if (Array.isArray(m.tool_calls)) {
          for (const tc of m.tool_calls) { scanFiles(tc?.result); scanFiles(tc?.result?.result); }
        }
        if (m.metadata?.imageInline?.fileId) {
          const fid = m.metadata.imageInline.fileId;
          if (!fileMap.has(fid)) {
            fileMap.set(fid, { id: fid, name: m.metadata.imageInline.caption || fid, mimeType: 'image/*', size: 0, createdAt: m.createdAt, origin: 'ai' });
          }
        }
      }

      // Enrichit avec vraies infos FileRecord (taille/mime si manque)
      const ids = [...fileMap.keys()];
      if (ids.length) {
        const records = await FileRecord.find({ id: { $in: ids } }, 'id name mimeType size createdAt').lean();
        for (const r of records) {
          const existing = fileMap.get(r.id);
          if (existing) {
            fileMap.set(r.id, {
              ...existing,
              name: r.name || existing.name,
              mimeType: r.mimeType || existing.mimeType,
              size: r.size || existing.size,
              createdAt: existing.createdAt || r.createdAt,
            });
          }
        }
      }

      const list = [...fileMap.values()].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      res.apiOk(list);
    } catch (e) {
      res.apiError(500, 'list_thread_files_failed', e?.message);
    }
  });

  r.get('/ai/threads/:threadId/jobs', requireThreadAccess('view'), async (req, res) => {
    const thread = req.aiThread;
    const jobs = await AiJob.find({ threadId: thread._id })
      .sort({ createdAt: -1 }).limit(50).lean();
    res.apiOk(jobs);
  });

  // ── Envoi d'un message user à un subagent en cours (mailbox) ──
  // Permet à l'utilisateur de piquer un subagent background : "Marie, ajoute
  // aussi la colonne TVA". Empile le message dans pendingMessages du job.
  r.post('/ai/jobs/:jobId/message', async (req, res) => {
    try {
      const { message, summary } = req.body || {};
      if (!message || typeof message !== 'string') {
        return res.apiError(400, 'missing_message', 'message (string) requis');
      }
      const AiJob = require('../../db/models/ai-job.model');
      const job = await AiJob.findOne({ id: req.params.jobId });
      if (!job) return res.apiError(404, 'job_not_found', 'Job introuvable');
      if (['completed', 'error', 'cancelled'].includes(job.status)) {
        return res.apiError(409, 'job_terminated', `Le job est ${job.status} — impossible d'envoyer un message.`);
      }
      await AiJob.updateOne(
        { id: job.id },
        { $push: { pendingMessages: {
            from: 'user',
            fromName: 'vous',
            message: String(message).slice(0, 8000),
            createdAt: new Date(),
            delivered: false,
          } } }
      );
      try {
        const { ROSTER } = require('../../ai/subagent/roster');
        const { emitJobEvent, emitThreadEvent } = require('../../ai/jobs/job-events');
        const ev = {
          type: 'subagent.message.received',
          targetJobId: job.id,
          targetName: ROSTER[job.subagentType]?.name || job.subagentType,
          fromName: 'vous',
          summary: summary || String(message).slice(0, 80),
          at: new Date().toISOString(),
        };
        emitJobEvent(job.id, ev);
        if (job.threadId) emitThreadEvent(String(job.threadId), ev);
      } catch { /* non-fatal */ }
      res.apiOk({ ok: true, jobId: job.id });
    } catch (e) {
      res.apiError(500, 'send_failed', e?.message || 'Erreur');
    }
  });

  // ── Réponse user à une question escaladée d'un sous-agent ──
  // Le frontend POST avec {requestId, parentJobId, answer}. On émet l'event
  // subagent.ask_user.answered sur le PARENT pour débloquer le subagent.
  // Envoyer un message utilisateur directement à la mailbox d'un subagent.
  // Le message sera délivré au début du prochain tour LLM du subagent.
  r.post('/ai/threads/:threadId/subagent-poke', requireThreadAccess('comment'), async (req, res) => {
    const { jobId, message } = req.body || {};
    if (!jobId || !message) return res.apiError(400, 'missing_fields', 'jobId + message required');
    try {
      const AiJob = require('../../db/models/ai-job.model');
      const { ROSTER } = require('../../ai/subagent/roster');
      const target = await AiJob.findOne({ id: jobId, threadId: req.aiThread._id });
      if (!target) return res.apiError(404, 'job_not_found', 'Subagent introuvable sur ce thread');
      if (['completed', 'error', 'cancelled'].includes(target.status)) {
        return res.apiError(400, 'subagent_terminated', `Le subagent ${target.status} ne peut plus recevoir de message`);
      }
      await AiJob.updateOne(
        { id: target.id },
        { $push: { pendingMessages: {
            from: 'user',
            fromName: 'Utilisateur',
            message: String(message).slice(0, 8000),
            createdAt: new Date(),
            delivered: false,
          } } }
      );
      const { emitJobEvent, emitThreadEvent } = require('../../ai/jobs/job-events');
      const targetName = ROSTER[target.subagentType]?.name || target.subagentType;
      const fullMessage = String(message);
      const ev = {
        type: 'subagent.message.received',
        targetJobId: target.id,
        targetName,
        fromName: 'Utilisateur',
        message: fullMessage.slice(0, 8000),
        summary: fullMessage.slice(0, 120),
        at: new Date().toISOString(),
      };
      emitJobEvent(target.id, ev);
      emitThreadEvent(String(req.aiThread._id), ev);
      res.apiOk({ ok: true, targetJobId: target.id, targetName });
    } catch (e) {
      console.error('[ai] subagent poke failed:', e?.message);
      res.apiError(500, 'poke_failed', e?.message || 'Erreur');
    }
  });

  r.post('/ai/threads/:threadId/subagent-answer', requireThreadAccess('comment'), async (req, res) => {
    const { requestId, parentJobId, answer } = req.body || {};
    if (!requestId || !parentJobId) return res.apiError(400, 'missing_fields', 'requestId + parentJobId required');
    try {
      const { emitJobEvent } = require('../../ai/jobs/job-events');
      emitJobEvent(parentJobId, {
        type: 'subagent.ask_user.answered',
        requestId,
        answer,
        source: 'user_via_thread',
      });
      // Persiste la réponse sur le AiMessage question
      try {
        await AiMessage.updateOne(
          { threadId: req.aiThread._id, 'metadata.extra.requestId': requestId },
          { $set: { 'question.answered': true, 'metadata.extra.answer': answer, 'metadata.extra.answeredAt': new Date() } }
        );
      } catch { /* non-fatal */ }
      res.apiOk({ ok: true });
    } catch (e) {
      res.apiError(500, 'answer_failed', e?.message || 'Erreur');
    }
  });

  // ── Delete un message user et tous les messages suivants (pour inline edit) ──
  r.delete('/ai/threads/:threadId/messages/:messageId', requireThreadAccess('edit'), async (req, res) => {
    const thread = req.aiThread;
    const { messageId } = req.params;
    try {
      const target = await AiMessage.findOne({ _id: messageId, threadId: thread._id }).lean();
      if (!target) return res.apiError(404, 'message_not_found', 'Message introuvable');
      if (target.role !== 'user') return res.apiError(400, 'not_user_message', 'Seuls les messages user peuvent être édités');
      const result = await AiMessage.deleteMany({
        threadId: thread._id,
        createdAt: { $gte: target.createdAt },
      });
      res.apiOk({ deleted: result.deletedCount || 0, fromMessageId: messageId });
    } catch (e) {
      console.error('[ai] delete messages failed:', e?.message);
      res.apiError(500, 'delete_failed', e?.message || 'Erreur suppression');
    }
  });

  // ── Usage tokens : jauge de contexte pour l'UI ──
  r.get('/ai/threads/:threadId/usage', requireThreadAccess('view'), async (req, res) => {
    const thread = req.aiThread;
    try {
      const { countThreadTokens, resolveLimit } = require('../../ai/context/token-counter');
      const { tokens, messageCount } = await countThreadTokens(thread._id);
      // Résolution modèle : override agent > env config (AI_MODEL getter qui
      // résout ANTHROPIC_MODEL ou OPENAI_MODEL selon provider) > fallback.
      // Bug corrigé : process.env.AI_MODEL n'est PAS défini (c'est un getter
      // dans src/config/env.js), on lisait donc toujours le fallback 'gpt-5.2'.
      const envConfig = require('../../config/env');
      let model = envConfig.AI_MODEL || process.env.AI_MODEL || 'gpt-5.2';
      if (thread.agentId) {
        try {
          const AiAgent = require('../../db/models/ai-agent.model');
          const agent = await AiAgent.findOne({ id: thread.agentId }).lean();
          if (agent?.llmModel) model = agent.llmModel;
        } catch {}
      }
      const limit = resolveLimit(model);
      const percent = limit > 0 ? Math.min(100, Math.round((tokens / limit) * 100)) : 0;
      res.apiOk({ tokens, limit, percent, model, messageCount });
    } catch (e) {
      console.error('[ai] usage endpoint failed:', e?.message);
      res.apiOk({ tokens: 0, limit: 128_000, percent: 0, model: 'unknown', messageCount: 0 });
    }
  });

  // L'ancien GET /threads/:id/stream a été supprimé.
  // Remplacé par GET /threads/:id/live (SSE master, cf. ai-routes/stream-master.js)
  // qui inclut le replay via Last-Event-ID et les events auto-suffisants (message
  // complet hydraté, plus de refetch nécessaire).

  // ── Plan proposal response ──
  // POST /ai/threads/:threadId/plan-response
  // Body: { requestId, decision:'approve'|'reject'|'modify', approvedSteps?, modifiedSteps?, missingInfoAnswers? }
  r.post('/ai/threads/:threadId/plan-response', requireThreadAccess('comment'), async (req, res) => {
    const thread = req.aiThread;
    const { requestId, decision, approvedSteps, modifiedSteps, missingInfoAnswers } = req.body || {};
    if (!requestId || !decision) {
      return res.apiError(400, 'missing_fields', 'requestId + decision required');
    }
    if (!['approve', 'reject', 'modify'].includes(decision)) {
      return res.apiError(400, 'invalid_decision', 'decision must be approve|reject|modify');
    }
    // Locate the plan_proposal message
    const msg = await AiMessage.findOne({
      threadId: thread._id,
      'metadata.kind': 'plan_proposal',
      'metadata.planProposal.requestId': requestId,
    });
    if (!msg) return res.apiError(404, 'plan_not_found', 'Plan proposal not found');
    if (msg.metadata?.planProposal?.answer) {
      return res.apiError(409, 'already_answered', 'Plan already answered');
    }
    // Validation missingInfo : si plan a des missingInfo et decision=approve,
    // toutes les clés doivent avoir une réponse non-vide.
    const missingInfo = msg.metadata?.planProposal?.missingInfo || [];
    let normalizedAnswers = null;
    if (missingInfo.length && decision === 'approve') {
      if (!missingInfoAnswers || typeof missingInfoAnswers !== 'object') {
        return res.apiError(400, 'missing_info_required', 'missingInfoAnswers required when plan has missingInfo');
      }
      normalizedAnswers = {};
      for (const mi of missingInfo) {
        const v = missingInfoAnswers[mi.key];
        if (v === undefined || v === null || String(v).trim() === '') {
          return res.apiError(400, 'missing_info_incomplete', `Missing answer for key: ${mi.key}`);
        }
        normalizedAnswers[mi.key] = v;
      }
    } else if (missingInfoAnswers && typeof missingInfoAnswers === 'object') {
      normalizedAnswers = { ...missingInfoAnswers };
    }
    // Patch the message
    const patch = {
      'metadata.planProposal.answer': decision,
      'metadata.planProposal.answeredAt': new Date(),
      'metadata.planProposal.answeredBy': req.user.id,
    };
    if (Array.isArray(approvedSteps)) patch['metadata.planProposal.approvedSteps'] = approvedSteps;
    if (Array.isArray(modifiedSteps)) patch['metadata.planProposal.modifiedSteps'] = modifiedSteps;
    if (normalizedAnswers) patch['metadata.planProposal.missingInfoAnswers'] = normalizedAnswers;
    await AiMessage.updateOne({ _id: msg._id }, { $set: patch });

    // Find an actively running AGENT_RUN (pas un subagent) qui aurait fait le
    // propose_plan et attendrait. On exclut les subagents (memory_extractor,
    // project_doc_writer, research…) qui n'écoutent jamais plan.resolved.
    const aliveThreshold = new Date(Date.now() - 90_000);
    const runningJob = await AiJob.findOne({
      threadId: thread._id,
      type: 'agent_run',
      status: { $in: ['running', 'queued', 'paused'] },
      $or: [
        { status: { $in: ['queued', 'paused'] } },
        { status: 'running', heartbeatAt: { $gte: aliveThreshold } },
      ],
    }).sort({ createdAt: -1 }).lean();
    console.log(`[plan-response] thread=${thread._id} decision=${decision} runningAgentRun=${runningJob?.id || 'none'}`);
    if (runningJob) {
      emitJobEvent(runningJob.id, {
        type: 'plan.resolved',
        requestId,
        decision,
        approvedSteps: Array.isArray(approvedSteps) ? approvedSteps : [],
        modifiedSteps: Array.isArray(modifiedSteps) ? modifiedSteps : null,
        missingInfoAnswers: normalizedAnswers || {},
      });
    } else if (decision === 'approve') {
      console.log(`[plan-response] no active job → spawn auto-resume for thread=${thread._id}`);
      // Pas de job actif : l'agent principal POST /messages a déjà rendu son
      // SSE et le tool propose_plan a retourné {pending:true} sans attendre.
      // On crée un nouveau agent_run qui reprend le thread pour exécuter le plan.
      try {
        const { newId } = require('../../utils/ids');
        const { runJob } = require('../../ai/jobs/job-runner');
        const stepsList = (msg.metadata.planProposal.steps || [])
          .map((s, i) => `${i + 1}. ${s.title}${s.description ? ' — ' + s.description : ''}${Array.isArray(s.tools) && s.tools.length ? ' (tools: ' + s.tools.join(', ') + ')' : ''}`)
          .join('\n');
        const answersBlock = normalizedAnswers
          ? '\n\nRéponses aux infos manquantes :\n' + Object.entries(normalizedAnswers).map(([k, v]) => `- ${k}: ${v}`).join('\n')
          : '';
        const resumePrompt = `Le plan que tu as proposé vient d'être APPROUVÉ par l'utilisateur.

Plan approuvé :
${stepsList}${answersBlock}

🎯 Exécute MAINTENANT les étapes du plan sans repasser par propose_plan. Va directement aux tools (spawn_subagent / render_structured / execute_code / project_write_file / etc.) selon ce que le plan demande. Ne pose pas de question, agis.`;
        const job = await AiJob.create({
          id: newId('aij_'),
          threadId: thread._id,
          workspaceId: thread.workspaceId,
          userId: req.user._id || req.user.id,
          companyId: req.user.companyId,
          type: 'agent_run',
          status: 'queued',
          mode: thread.mode || 'chat',
          maxLoops: 30,
        });
        setImmediate(() => {
          runJob(job.id, {
            prompt: resumePrompt,
            // Empêche un nouveau propose_plan en boucle
            toolsDenied: ['propose_plan'],
          }).catch(e => console.error('[plan-response] auto-resume failed:', e?.message));
        });
        const { emitThreadEvent } = require('../../ai/jobs/job-events');
        emitThreadEvent(String(thread._id), { type: 'ai.resume.started', jobId: job.id, reason: 'plan_approved' });
      } catch (e) {
        console.error('[plan-response] auto-resume create job failed:', e?.message);
      }
    }
    const updated = await AiMessage.findById(msg._id).lean();
    res.apiOk({ ok: true, message: updated });
  });

  // Routes /ai/threads/:id/project-root/* + /ai/project-connectors/* (cf. ai-routes/project-root.js)
  require('./ai-routes/project-root')(r);


  // ══════════════════════════════
  //  CANVAS
  // ══════════════════════════════

  const AiCanvasState = require('../../db/models/ai-canvas-state.model');

  // Work-plan unifié — source unique pour le panneau droit "Plan de travail".
  // Retourne : plan (propose_plan), todo principal, subagents avec leurs
  // tools/todos internes/widgets, artefacts produits, permissions pending.
  r.get('/ai/threads/:threadId/work-plan', requireThreadAccess('view'), async (req, res) => {
    const threadId = req.aiThread._id;
    try {
      const AiJob = require('../../db/models/ai-job.model');
      const FileRecord = require('../../db/models/file.model');

      // Tous les messages du thread (tri chrono)
      const allMsgs = await AiMessage.find({ threadId })
        .sort({ createdAt: 1 })
        .lean();

      // Plan = dernier propose_plan
      const planMsg = [...allMsgs].reverse().find(m => m?.metadata?.kind === 'plan_proposal');
      const plan = planMsg
        ? {
            messageId: String(planMsg._id),
            summary: planMsg.metadata?.planProposal?.summary || '',
            steps: planMsg.metadata?.planProposal?.steps || [],
            risks: planMsg.metadata?.planProposal?.risks || [],
            createdAt: planMsg.createdAt,
          }
        : null;

      // Todo principal = dernier session-todos-*
      const todoMsg = [...allMsgs].reverse().find(m =>
        m?.metadata?.kind === 'todo_list'
        && typeof m?.metadata?.widgetId === 'string'
        && m.metadata.widgetId.startsWith('session-todos')
      );
      const mainTodo = todoMsg
        ? {
            messageId: String(todoMsg._id),
            widgetId: todoMsg.metadata?.widgetId,
            todos: todoMsg.metadata?.todoList?.todos || [],
            updatedAt: todoMsg.metadata?.widgetUpdatedAt || todoMsg.createdAt,
          }
        : null;

      // Tous les jobs subagent du thread
      const subagentJobs = await AiJob.find(
        { threadId, type: 'subagent' },
        { id: 1, status: 1, subagentType: 1, subagentInstructions: 1, parentJobId: 1,
          startedAt: 1, finishedAt: 1, duration: 1, error: 1, result: 1,
          iteration: 1, heartbeatAt: 1, pendingMessages: 1, depth: 1 },
      ).sort({ createdAt: 1 }).lean();

      // Canvas state : toolCalls live par subagent (mis à jour en temps réel via
      // persistCanvasEvent('canvas.task.toolcall')). Le count sur j.result.artifacts
      // n'est rempli qu'à la fin du job → avant ça, le panel affichait "0 tools"
      // même pendant l'exécution. On lit canvas_state pour avoir le vrai temps réel.
      const AiCanvasState = require('../../db/models/ai-canvas-state.model');
      let canvasTasksById = new Map();
      try {
        const canvasState = await AiCanvasState.findOne({ threadId }, 'tasks').lean();
        for (const t of (canvasState?.tasks || [])) {
          canvasTasksById.set(String(t.id || t.jobId), t);
        }
      } catch { /* non-fatal */ }

      // Roster enrichissement
      let ROSTER = {};
      try { ROSTER = require('../../ai/subagent/roster').ROSTER || {}; } catch {}

      const subagents = subagentJobs.map(j => {
        const info = ROSTER[j.subagentType] || {};
        const canvasTask = canvasTasksById.get(String(j.id));
        const liveToolCalls = Array.isArray(canvasTask?.toolCalls) ? canvasTask.toolCalls : [];
        // Todo interne du subagent (subagent-todos-<jobId>)
        const internalTodoMsg = allMsgs.find(m =>
          m?.metadata?.kind === 'todo_list'
          && m?.metadata?.widgetId === `subagent-todos-${String(j.id).slice(-12)}`
        );
        // Widgets produits par ce subagent
        const widgets = allMsgs
          .filter(m => m?.metadata?.subagentJobId === j.id && m?.metadata?.widgetId)
          .map(m => ({
            widgetId: m.metadata.widgetId,
            kind: m.metadata.kind,
            messageId: String(m._id),
            title: (m.content || '').slice(0, 120),
          }));
        // Permission pending
        const pendingPerm = allMsgs.find(m =>
          m?.metadata?.kind === 'permission_request'
          && m?.metadata?.permissionRequest?.jobId === j.id
          && !m?.metadata?.permissionRequest?.answer
        );
        return {
          jobId: j.id,
          parentJobId: j.parentJobId || null,
          subagentType: j.subagentType,
          agentName: info.name || j.subagentType,
          agentEmoji: info.emoji || '🤖',
          agentColor: info.color || '#888',
          agentTagline: info.tagline || '',
          status: j.status,
          startedAt: j.startedAt,
          finishedAt: j.finishedAt,
          duration: j.duration,
          error: j.error,
          summary: (j.result?.summary || '').slice(0, 500),
          // Priorité au compte live (canvas_state pendant exécution). Fallback sur
          // result.artifacts (final) pour les jobs terminés pré-canvas_state.
          toolCallsCount: liveToolCalls.length || (Array.isArray(j.result?.artifacts) ? j.result.artifacts.length : 0),
          toolCalls: liveToolCalls.slice(-20).map(tc => ({
            name: tc.name,
            status: tc.status,
            at: tc.at,
            argsSummary: tc.argsSummary,
          })),
          internalTodo: internalTodoMsg
            ? { todos: internalTodoMsg.metadata?.todoList?.todos || [] }
            : null,
          widgets,
          pendingMessages: (j.pendingMessages || []).filter(m => !m.delivered).length,
          pendingPermission: pendingPerm
            ? {
                messageId: String(pendingPerm._id),
                requestId: pendingPerm.metadata.permissionRequest.requestId,
                toolName: pendingPerm.metadata.permissionRequest.toolName,
                risk: pendingPerm.metadata.permissionRequest.risk,
              }
            : null,
        };
      });

      // Artefacts (fichiers uploadés par user + fichiers générés par tools)
      const fileIds = new Set();
      const artifacts = [];
      for (const m of allMsgs) {
        // Fichier attaché par user
        if (Array.isArray(m.attachments)) {
          for (const att of m.attachments) {
            if (att?.fileId && !fileIds.has(att.fileId)) {
              fileIds.add(att.fileId);
              artifacts.push({
                fileId: att.fileId,
                name: att.name || 'fichier',
                mimeType: att.mimeType,
                size: att.size,
                source: 'user_upload',
                messageId: String(m._id),
                createdAt: m.createdAt,
              });
            }
          }
        }
        // Fichier inline widget
        if (m?.metadata?.fileInline?.fileId) {
          const f = m.metadata.fileInline;
          if (!fileIds.has(f.fileId)) {
            fileIds.add(f.fileId);
            artifacts.push({
              fileId: f.fileId,
              name: f.name || 'fichier',
              mimeType: f.mimeType,
              size: f.size,
              source: m.metadata.subagentJobId ? 'subagent' : 'agent',
              subagentJobId: m.metadata.subagentJobId || null,
              messageId: String(m._id),
              createdAt: m.createdAt,
            });
          }
        }
      }
      // Images inline = artefacts aussi
      for (const m of allMsgs) {
        const img = m?.metadata?.imageInline;
        if (img?.fileId && !fileIds.has(img.fileId)) {
          fileIds.add(img.fileId);
          artifacts.push({
            fileId: img.fileId,
            name: img.caption || img.alt || 'image',
            mimeType: 'image/*',
            source: m.metadata.subagentJobId ? 'subagent' : 'agent',
            subagentJobId: m.metadata.subagentJobId || null,
            messageId: String(m._id),
            createdAt: m.createdAt,
          });
        }
      }

      // Actions = tool calls chronologiques (toolCalls des messages assistants)
      const actions = [];
      for (const m of allMsgs) {
        if (m.role !== 'assistant') continue;
        const tcs = Array.isArray(m.toolCalls) ? m.toolCalls : [];
        for (const tc of tcs) {
          actions.push({
            messageId: String(m._id),
            id: tc.id,
            name: tc.name,
            status: tc.status,
            duration: tc.duration,
            at: m.createdAt,
            agent: m.metadata?.subagentJobId ? 'subagent' : 'parent',
            subagentJobId: m.metadata?.subagentJobId || null,
          });
        }
      }

      res.apiOk({
        threadId: String(threadId),
        plan,
        mainTodo,
        subagents,
        artifacts,
        actions: actions.slice(-100),
      });
    } catch (e) {
      console.error('[work-plan] failed:', e?.message);
      res.apiError(500, 'work_plan_failed', e?.message || 'Erreur');
    }
  });

  r.get('/ai/threads/:threadId/canvas', requireThreadAccess('view'), async (req, res) => {
    const doc = await AiCanvasState.findOne({ threadId: req.aiThread._id }).lean();
    // Dédoublonnage research.steps : d'anciens events ont pu créer 2 entries
    // (running + done) pour la même step id → garde celle avec le status le plus
    // avancé. Plus de spinner infini après reload.
    if (doc?.research?.steps?.length) {
      const rank = { queued: 0, running: 1, error: 2, done: 3 };
      const byId = new Map();
      for (const s of doc.research.steps) {
        if (!s?.id) { byId.set(Symbol(), s); continue; }
        const prev = byId.get(s.id);
        if (!prev) { byId.set(s.id, s); continue; }
        const a = rank[s.status] ?? 0;
        const b = rank[prev.status] ?? 0;
        byId.set(s.id, a >= b ? s : prev);
      }
      const deduped = [...byId.values()];
      if (deduped.length !== doc.research.steps.length) {
        doc.research.steps = deduped;
        try {
          await AiCanvasState.updateOne(
            { threadId: req.aiThread._id },
            { $set: { 'research.steps': deduped } }
          );
        } catch { /* non-fatal */ }
      }
    }
    // Réconciliation : si des tasks sont encore en 'running'/'queued' mais que
    // leur AiJob réel est completed/error, on patch le status avant de répondre
    // (évite le spinner infini si le dernier event canvas.task.update a été perdu).
    if (doc?.tasks?.length) {
      const stuckIds = doc.tasks
        .filter(t => t.status === 'running' || t.status === 'queued' || t.status === 'waiting_dependency')
        .map(t => t.jobId || t.id)
        .filter(Boolean);
      if (stuckIds.length) {
        const jobs = await AiJob.find({ id: { $in: stuckIds } }).select('id status finishedAt error heartbeatAt startedAt').lean();
        const jobMap = new Map(jobs.map(j => [j.id, j]));
        const STALE_MS = 5 * 60 * 1000; // 5 min sans heartbeat → stalled
        const now = Date.now();
        let patched = false;
        for (const t of doc.tasks) {
          const j = jobMap.get(t.jobId || t.id);
          if (!j) continue;
          // Cas 1 : job terminé côté DB mais task encore running
          if ((j.status === 'completed' || j.status === 'error' || j.status === 'cancelled') && j.status !== t.status) {
            t.status = j.status;
            if (j.finishedAt) t.finishedAt = j.finishedAt;
            if (j.error) t.error = j.error;
            patched = true;
            continue;
          }
          // Cas 2 : job running côté DB mais heartbeat périmé → on considère mort
          const hb = j.heartbeatAt ? new Date(j.heartbeatAt).getTime() : null;
          const started = j.startedAt ? new Date(j.startedAt).getTime() : null;
          const ref = hb || started || 0;
          if ((j.status === 'running' || j.status === 'queued') && ref && (now - ref) > STALE_MS) {
            // Force l'état terminal pour éviter le spinner infini
            try {
              await AiJob.updateOne(
                { id: j.id },
                { $set: { status: 'error', error: 'stalled_timeout', finishedAt: new Date() } }
              );
            } catch { /* non-fatal */ }
            t.status = 'error';
            t.error = 'stalled_timeout';
            t.finishedAt = new Date();
            patched = true;
          }
        }
        if (patched) {
          try {
            await AiCanvasState.updateOne(
              { threadId: req.aiThread._id },
              { $set: { tasks: doc.tasks } }
            );
          } catch { /* non-fatal */ }
        }
      }
    }
    res.apiOk(doc || { threadId: req.aiThread._id, activeTab: 'none' });
  });

  r.put('/ai/threads/:threadId/canvas', requireThreadAccess('edit'), async (req, res) => {
    const patch = {};
    const allowed = ['activeTab', 'document', 'research', 'tasks', 'files'];
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const doc = await AiCanvasState.findOneAndUpdate(
      { threadId: req.aiThread._id },
      { $set: patch, $setOnInsert: { threadId: req.aiThread._id } },
      { upsert: true, new: true }
    );
    res.apiOk(doc);
  });

  r.post('/ai/threads/:threadId/canvas/document/export', requireThreadAccess('edit'), async (req, res) => {
    const doc = await AiCanvasState.findOne({ threadId: req.aiThread._id }).lean();
    if (!doc?.document) return res.apiError(404, 'no_document', 'No canvas document to export');
    res.apiOk({
      format: doc.document.format,
      title: doc.document.title,
      fileId: doc.document.fileId || null,
      previewHtml: doc.document.previewHtml || '',
    });
  });

  // ══════════════════════════════
  //  PERMISSIONS
  // ══════════════════════════════

  const AiPermissionGrant = require('../../db/models/ai-permission-grant.model');

  // Liste globale des permissions actives pour le workspace courant (fallback
  // quand le front n'a pas encore sélectionné de thread ou ouvre l'onglet settings global).
  r.get('/ai/permissions', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const grants = await AiPermissionGrant.find({ workspaceId: ws._id })
      .sort({ decidedAt: -1 }).limit(200).lean();
    res.apiOk(grants);
  });

  r.get('/ai/threads/:threadId/permissions', requireThreadAccess('view'), async (req, res) => {
    const grants = await AiPermissionGrant.find({ threadId: req.aiThread._id })
      .sort({ decidedAt: -1 }).lean();
    res.apiOk(grants);
  });

  r.delete('/ai/threads/:threadId/permissions/:grantId', requireThreadAccess('edit'), async (req, res) => {
    const g = await AiPermissionGrant.findOne({ id: req.params.grantId, threadId: req.aiThread._id });
    if (!g) return res.apiError(404, 'grant_not_found', 'Grant not found');
    await AiPermissionGrant.deleteOne({ _id: g._id });
    res.apiOk({ deleted: true });
  });

  r.get('/ai/workspaces/:wsId/permissions', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    if (String(ws._id) !== String(req.params.wsId) && ws.id !== req.params.wsId) {
      return res.apiError(403, 'forbidden', 'Workspace mismatch');
    }
    const grants = await AiPermissionGrant.find({ workspaceId: ws._id })
      .sort({ decidedAt: -1 }).limit(200).lean();
    res.apiOk(grants);
  });

  // ══════════════════════════════
  //  USER PREFERENCES
  // ══════════════════════════════

  const AiUserPreferences = require('../../db/models/ai-user-preferences.model');

  r.get('/ai/preferences', async (req, res) => {
    const doc = await AiUserPreferences.findOne({ userId: req.user.id }).lean();
    res.apiOk(doc || {
      userId: req.user.id,
      defaultAutonomyLevel: 'autonomous',
      cacheBehavior: {}, permissionDefaults: {}, canvasBehavior: {},
    });
  });

  r.put('/ai/preferences', async (req, res) => {
    const allowed = [
      'defaultAutonomyLevel', 'defaultAgentId', 'cacheBehavior',
      'permissionDefaults', 'canvasBehavior', 'webSearchProvider', 'workspaceId',
    ];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const doc = await AiUserPreferences.findOneAndUpdate(
      { userId: req.user.id },
      { $set: patch, $setOnInsert: { userId: req.user.id } },
      { upsert: true, new: true }
    );
    res.apiOk(doc);
  });

  r.get('/ai/threads/:threadId/preferences', requireThreadAccess('view'), async (req, res) => {
    res.apiOk(req.aiThread.metadata?.preferencesOverride || {});
  });

  r.put('/ai/threads/:threadId/preferences', requireThreadAccess('edit'), async (req, res) => {
    const override = req.body || {};
    await AiThread.updateOne(
      { _id: req.aiThread._id },
      { $set: { 'metadata.preferencesOverride': override } }
    );
    res.apiOk(override);
  });

  r.delete('/ai/threads/:threadId/preferences', requireThreadAccess('edit'), async (req, res) => {
    await AiThread.updateOne(
      { _id: req.aiThread._id },
      { $unset: { 'metadata.preferencesOverride': 1 } }
    );
    res.apiOk({ deleted: true });
  });

  // ══════════════════════════════
  //  THREAD SHARING
  // ══════════════════════════════

  r.post('/ai/threads/:threadId/share', requireThreadAccess('admin'), async (req, res) => {
    const { userId, permission } = req.body || {};
    if (!userId) return res.apiError(400, 'missing_user', 'userId required');
    const perm = ['view', 'comment', 'edit'].includes(permission) ? permission : 'view';
    const thread = req.aiThread;
    const idx = (thread.sharedWith || []).findIndex(s => String(s.userId) === String(userId));
    let ops;
    if (idx >= 0) {
      ops = { $set: {
        [`sharedWith.${idx}.permission`]: perm,
        [`sharedWith.${idx}.addedBy`]: req.user.id,
        visibility: 'shared',
      }};
    } else {
      ops = {
        $set: { visibility: 'shared' },
        $push: { sharedWith: { userId, permission: perm, addedBy: req.user.id, addedAt: new Date(), notificationSent: false } },
      };
    }
    await AiThread.updateOne({ _id: thread._id }, ops);
    const updated = await AiThread.findById(thread._id).lean();
    res.apiOk(updated);
  });

  r.get('/ai/threads/:threadId/shares', requireThreadAccess('view'), async (req, res) => {
    res.apiOk({
      visibility: req.aiThread.visibility || 'private',
      sharedWith: req.aiThread.sharedWith || [],
      sharedWithRoles: req.aiThread.sharedWithRoles || [],
    });
  });

  r.put('/ai/threads/:threadId/shares/:userId', requireThreadAccess('admin'), async (req, res) => {
    const { permission } = req.body || {};
    const perm = ['view', 'comment', 'edit'].includes(permission) ? permission : 'view';
    const thread = req.aiThread;
    const idx = (thread.sharedWith || []).findIndex(s => String(s.userId) === String(req.params.userId));
    if (idx < 0) return res.apiError(404, 'share_not_found', 'User not shared with this thread');
    await AiThread.updateOne(
      { _id: thread._id },
      { $set: { [`sharedWith.${idx}.permission`]: perm } }
    );
    const updated = await AiThread.findById(thread._id).lean();
    res.apiOk(updated);
  });

  r.delete('/ai/threads/:threadId/shares/:userId', requireThreadAccess('admin'), async (req, res) => {
    const thread = req.aiThread;
    await AiThread.updateOne(
      { _id: thread._id },
      { $pull: { sharedWith: { userId: req.params.userId } } }
    );
    // If no one else, mark private
    const updated = await AiThread.findById(thread._id).lean();
    if (!(updated.sharedWith || []).length) {
      await AiThread.updateOne({ _id: thread._id }, { $set: { visibility: 'private' } });
      updated.visibility = 'private';
    }
    res.apiOk(updated);
  });

  // Routes /ai/threads/:id/knowledge/* (cf. ai-routes/project-knowledge.js)
  require('./ai-routes/project-knowledge')(r);


  // Routes /ai/prompt-templates/* + /ai/user-skills/* (cf. ai-routes/library.js)
  require('./ai-routes/library')(r);


  return r;
};
