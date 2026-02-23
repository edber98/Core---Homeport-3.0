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
const { buildContext } = require('../../ai/context/context-builder');
const { runAgent } = require('../../ai/agent-runner');
const { runHarness } = require('../../ai/agent-harness');
const { toolIndex } = require('../../ai/tools/tool-index');

// Active SSE streams — keyed by threadId string
const activeStreams = new Map();

module.exports = function () {
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  // ── Resolve agent overrides (provider:xxx or aia_xxx) ──
  async function resolveAgentOverrides(agentId, context) {
    if (!agentId || agentId === 'general') return null;

    // System agent: provider:<key>
    if (agentId.startsWith('provider:')) {
      const providerKey = agentId.slice('provider:'.length);
      const provider = (context.availableProviders || []).find(p => p.key === providerKey);
      if (!provider) return null;

      // Load all node templates for this provider to list available tools
      const NodeTemplate = require('../../db/models/node-template.model');
      const templates = await NodeTemplate.find(
        { providerKey, enabled: { $ne: false } },
        'key title description type'
      ).lean();

      const toolLines = templates.map(t =>
        `- \`${t.key}\` : ${t.title || t.key}${t.description ? ' — ' + t.description : ''}`
      );

      const promptFragment = `Tu es un spécialiste ${provider.name}. Tu connais parfaitement les outils ${provider.name} et tu privilégies leur utilisation.

### Outils ${provider.name} disponibles (${templates.length})
${toolLines.join('\n')}

### RÈGLES CRITIQUES — mode agent ${provider.name}

1. **TOUJOURS utiliser \`execute_tool\`** pour interagir avec ${provider.name}. Tu as la liste complète des outils ci-dessus — utilise-les directement avec la bonne clé.

2. **JAMAIS \`search_tools\` pour chercher des DONNÉES** — \`search_tools\` cherche des templates/actions dans la plateforme, PAS dans ${provider.name}. Quand l'utilisateur dit "cherche X", "trouve X", "liste X", il parle de données ${provider.name}.

3. **Recherche et filtrage** — Les outils de type "Lister" acceptent généralement des paramètres de filtrage (search, query, name, etc.). Si tu ne connais pas les paramètres exacts, utilise \`get_tool_details\` avec la clé pour voir le schéma complet des arguments AVANT d'exécuter.

4. **Autonomie** — Respecte le niveau d'autonomie défini dans les règles générales pour les confirmations.

5. **Vocabulaire utilisateur** — L'utilisateur peut utiliser des termes génériques ("cherche", "montre-moi", "je veux voir") ou des termes spécifiques à ${provider.name}. Dans tous les cas, identifie l'outil ${provider.name} approprié et exécute-le.`;

      return { promptFragment };
    }

    // Custom agent: aia_xxx
    const agent = await AiAgent.findOne({ id: agentId }).lean();
    if (!agent) return null;

    let promptFragment = agent.systemPrompt || '';

    // Multi-provider access: load NodeTemplates for all allowedProviders
    if (agent.allowedProviders?.length) {
      const NodeTemplate = require('../../db/models/node-template.model');
      const Provider = require('../../db/models/provider.model');
      const providerDocs = await Provider.find(
        { key: { $in: agent.allowedProviders } },
        'key name title'
      ).lean();
      const templates = await NodeTemplate.find(
        { providerKey: { $in: agent.allowedProviders }, enabled: { $ne: false } },
        'key title description type providerKey'
      ).lean();

      // Group templates by provider
      const byProvider = {};
      for (const t of templates) {
        if (!byProvider[t.providerKey]) byProvider[t.providerKey] = [];
        byProvider[t.providerKey].push(t);
      }

      const sections = [];
      for (const p of providerDocs) {
        const pTemplates = byProvider[p.key] || [];
        const toolLines = pTemplates.map(t =>
          `- \`${t.key}\` : ${t.title || t.key}${t.description ? ' — ' + t.description : ''}`
        );
        sections.push(`### ${p.title || p.name} (${pTemplates.length} actions)\n${toolLines.join('\n')}`);
      }

      if (sections.length) {
        promptFragment += `\n\n## Outils des providers associés\nTu as accès aux outils suivants. Utilise-les directement via \`execute_tool\` avec la clé correspondante.\n\n${sections.join('\n\n')}`;
      }
    }

    return {
      promptFragment: promptFragment || null,
      llmProvider: agent.llmProvider || null,
      llmModel: agent.llmModel || null,
      toolGroups: agent.toolGroups?.length ? agent.toolGroups : null,
      blockedTools: agent.blockedTools?.length ? agent.blockedTools : null,
      maxToolLoops: agent.maxToolLoops || null,
      routerBehavior: agent.routerBehavior || null,
      autonomyLevel: agent.autonomyLevel || null,
    };
  }

  // ── Workspace access helper (supports both ObjectId and custom id like ws_xxx) ──
  async function ensureWorkspaceAccess(req, res) {
    const wsId = req.headers['x-workspace-id'] || req.query.workspaceId;
    if (!wsId) {
      res.apiError(400, 'missing_workspace', 'workspaceId required');
      return null;
    }
    const id = String(wsId);
    const ws = Types.ObjectId.isValid(id)
      ? await Workspace.findById(id)
      : await Workspace.findOne({ id });
    if (!ws || String(ws.companyId) !== req.user.companyId) {
      res.apiError(404, 'workspace_not_found', 'Workspace not found');
      return null;
    }
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) {
      res.apiError(403, 'not_a_member', 'Not a workspace member');
      return null;
    }
    return ws;
  }

  // ══════════════════════════════
  //  THREADS
  // ══════════════════════════════

  // List threads (workspace-scoped)
  r.get('/ai/threads', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
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
    const list = await AiThread.find(filter).sort({ updatedAt: -1 }).limit(50).lean();
    res.apiOk(list);
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
    await AiMessage.deleteMany({ threadId: thread._id });
    await AiThread.deleteOne({ _id: thread._id });
    res.apiOk(true);
  });

  // Regenerate thread title using LLM
  r.post('/ai/threads/:threadId/regenerate-title', async (req, res) => {
    const thread = await findThread(req.params.threadId);
    if (!thread) return res.apiError(404, 'thread_not_found', 'Thread not found');
    const ws = await Workspace.findById(thread.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'thread_not_found', 'Thread not found');

    const messages = await AiMessage.find({ threadId: thread._id }).sort({ createdAt: 1 }).limit(10).lean();
    const summary = messages.map(m => `${m.role}: ${(m.content || '').slice(0, 200)}`).join('\n');

    const env = require('../../config/env');
    const { createLlmClient } = require('../../ai/llm');
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

  // Duplicate thread
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

    // Build all messages first
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
        // Resolve file attachments into multimodal content blocks
        if (m.attachments?.length) {
          try {
            const attBlocks = await resolveAttachments(m.attachments, wsId);
            if (attBlocks.length) {
              const parts = [];
              if (content) parts.push({ type: 'text', text: content });
              parts.push(...attBlocks);
              allMessages.push({ role: 'user', content: parts.length === 1 && parts[0].type === 'text' ? content : parts, _attTokens: estimateAttachmentTokens(attBlocks) });
            } else {
              allMessages.push({ role: 'user', content });
            }
          } catch (e) {
            console.error('[ai] attachment resolve error:', e?.message);
            allMessages.push({ role: 'user', content });
          }
        } else {
          allMessages.push({ role: 'user', content });
        }
      } else if (m.role === 'assistant') {
        if (m.toolCalls?.length) {
          allMessages.push({
            role: 'assistant',
            content: m.content || null,
            tool_calls: m.toolCalls.map(tc => ({ id: tc.id, name: tc.name, input: tc.args || {} })),
          });
          for (const tc of m.toolCalls) {
            let resultStr = typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result || {});
            if (resultStr.length > MAX_TOOL_RESULT_CHARS) {
              resultStr = resultStr.slice(0, MAX_TOOL_RESULT_CHARS) + '... [tronqué]';
            }
            allMessages.push({ role: 'tool', tool_call_id: tc.id, content: resultStr });
          }
        } else {
          allMessages.push({ role: 'assistant', content: m.content || '' });
        }
      } else {
        allMessages.push({ role: m.role, content: m.content || '' });
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

    // SSE response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    // Disable TCP Nagle algorithm for real-time streaming
    if (res.socket) res.socket.setNoDelay(true);
    res.flushHeaders();

    const send = (obj) => {
      try {
        res.write(`data: ${JSON.stringify(obj)}\n\n`);
        if (typeof res.flush === 'function') res.flush();
      } catch {}
    };
    const heartbeat = setInterval(() => { try { res.write(':keepalive\n\n'); } catch {} }, 15000);
    let closed = false;
    let doneSent = false;
    const ac = new AbortController();
    const threadKey = String(thread._id);
    activeStreams.set(threadKey, ac);
    const onClose = () => { closed = true; clearInterval(heartbeat); ac.abort(); activeStreams.delete(threadKey); };
    req.on('close', onClose);
    res.on('close', onClose);

    // Build metadata from thread for mode-specific tools
    // graph/schema from body (latest unsaved state) take priority over thread metadata (DB state)
    const metadata = {
      flowId: thread.flowId || undefined,
      nodeId: thread.nodeId || undefined,
      formId: thread.metadata?.formId || undefined,
      branch: thread.metadata?.branch || undefined,
      graph: graph || thread.metadata?.graph || undefined,
      schema: schema || thread.metadata?.schema || undefined,
      workspaceId: String(ws._id),
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
        if (closed || ac.signal.aborted) break;

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
            if (process.env.AI_DEBUG) console.log(`[ai-sse] tool.start → ${event.name} (id=${event.id})`);
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
            console.log(`[ai-sse] tool.input_delta → ${event.name} +${(event.text || '').length}chars (id=${event.id})`);
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
      if (fullText || toolCalls.length) {
        // Clean empty segments
        const cleanSegments = segments.filter(s =>
          (s.type === 'text' && s.content?.trim()) || (s.type === 'tools' && s.toolCalls?.length)
        );
        await AiMessage.create({
          threadId: thread._id,
          role: 'assistant',
          content: fullText,
          toolCalls: toolCalls.length ? toolCalls : undefined,
          segments: cleanSegments.length ? cleanSegments : undefined,
          question: questionData ? { text: questionData.text, questionType: questionData.questionType, options: questionData.options, questions: questionData.questions } : undefined,
          cancelled: ac.signal.aborted || undefined,
          usage: usageData && (usageData.input || usageData.output) ? usageData : undefined,
        });
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
      clearInterval(heartbeat);
      activeStreams.delete(threadKey);
      if (!doneSent) { doneSent = true; send({ type: 'done' }); }
      try { res.end(); } catch {}
    }
  });

  // Cancel active stream for a thread
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

  // ══════════════════════════════
  //  CONTEXT
  // ══════════════════════════════

  // Get full built context
  r.get('/ai/context', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const context = await buildContext({ companyId: ws.companyId, workspaceId: ws._id, userId: req.user.id });
    res.apiOk(context);
  });

  // Update company context
  r.put('/ai/context/company', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const { description, industry, services, systemPrompt, preferences } = req.body || {};
    const update = {};
    if (description !== undefined) update.description = description;
    if (industry !== undefined) update.industry = industry;
    if (services !== undefined) update.services = services;
    if (systemPrompt !== undefined) update.systemPrompt = systemPrompt;
    if (preferences !== undefined) update.preferences = preferences;
    const doc = await AiCompanyContext.findOneAndUpdate(
      { companyId: ws.companyId },
      { $set: update, $setOnInsert: { companyId: ws.companyId } },
      { upsert: true, new: true }
    );
    res.apiOk(doc);
  });

  // Update workspace context
  r.put('/ai/context/workspace', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const { description, customInstructions } = req.body || {};
    const update = {};
    if (description !== undefined) update.description = description;
    if (customInstructions !== undefined) update.customInstructions = customInstructions;
    const doc = await AiWorkspaceContext.findOneAndUpdate(
      { workspaceId: ws._id },
      { $set: update, $setOnInsert: { companyId: ws.companyId, workspaceId: ws._id } },
      { upsert: true, new: true }
    );
    res.apiOk(doc);
  });

  // Update user context / memory (merge key-by-key, null = delete)
  r.put('/ai/context/user', async (req, res) => {
    const { preferences, memory } = req.body || {};
    const update = {};
    const unset = {};

    // Merge preferences key-by-key (not replace entire object)
    if (preferences !== undefined) {
      for (const [k, v] of Object.entries(preferences)) {
        if (v === null) {
          unset[`preferences.${k}`] = '';
        } else {
          update[`preferences.${k}`] = v;
        }
      }
    }

    // Merge memory key-by-key, null = delete key
    if (memory !== undefined) {
      for (const [k, v] of Object.entries(memory)) {
        if (v === null) {
          unset[`memory.${k}`] = '';
        } else {
          update[`memory.${k}`] = v;
        }
      }
    }

    const ops = {};
    if (Object.keys(update).length) ops.$set = update;
    if (Object.keys(unset).length) ops.$unset = unset;
    if (!ops.$set) ops.$set = {};
    ops.$setOnInsert = { companyId: req.user.companyId, userId: req.user.id };

    const doc = await AiUserContext.findOneAndUpdate(
      { userId: req.user.id },
      ops,
      { upsert: true, new: true }
    );
    res.apiOk(doc);
  });

  // ── Project memory (per flow/form) ──

  // Get project memory
  r.get('/ai/project-memory/:elementType/:elementId', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const AiProjectMemory = require('../../db/models/ai-project-memory.model');
    const doc = await AiProjectMemory.findOne({
      workspaceId: ws._id,
      elementType: req.params.elementType,
      elementId: req.params.elementId,
    }).lean();
    res.apiOk(doc?.memory || {});
  });

  // Update project memory (merge key-by-key, null = delete)
  r.put('/ai/project-memory/:elementType/:elementId', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const AiProjectMemory = require('../../db/models/ai-project-memory.model');
    const { memory } = req.body || {};
    if (!memory) return res.apiError(400, 'missing_memory', 'memory object required');
    const update = {};
    const unset = {};
    for (const [k, v] of Object.entries(memory)) {
      if (v === null) {
        unset[`memory.${k}`] = '';
      } else {
        update[`memory.${k}`] = v;
      }
    }
    const ops = {};
    if (Object.keys(update).length) ops.$set = update;
    if (Object.keys(unset).length) ops.$unset = unset;
    if (!ops.$set) ops.$set = {};
    ops.$setOnInsert = { workspaceId: ws._id, elementType: req.params.elementType, elementId: req.params.elementId };
    const doc = await AiProjectMemory.findOneAndUpdate(
      { workspaceId: ws._id, elementType: req.params.elementType, elementId: req.params.elementId },
      ops,
      { upsert: true, new: true }
    );
    res.apiOk(doc?.memory || {});
  });

  // Get available providers (names only, no secrets)
  r.get('/ai/context/providers', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const Credential = require('../../db/models/credential.model');
    const Provider = require('../../db/models/provider.model');
    const credentials = await Credential.find({ workspaceId: ws._id }, 'name providerKey').lean();
    const providerKeys = [...new Set(credentials.map(c => c.providerKey))];
    const providers = await Provider.find({ key: { $in: providerKeys } }, 'key name title iconUrl').lean();
    res.apiOk(providers.map(p => ({
      key: p.key,
      name: p.title || p.name,
      icon: p.iconUrl || null,
      credentials: credentials.filter(c => c.providerKey === p.key).map(c => ({ name: c.name })),
    })));
  });

  // ══════════════════════════════
  //  TOOL INDEX
  // ══════════════════════════════

  // Search tools
  r.get('/ai/tools', async (req, res) => {
    await toolIndex.ensureBuilt();
    const results = toolIndex.search(req.query.q || '', {
      provider: req.query.provider,
      category: req.query.category,
      limit: parseInt(req.query.limit || '20', 10),
    });
    res.apiOk(results);
  });

  // Get tool details
  r.get('/ai/tools/:key', async (req, res) => {
    const NodeTemplate = require('../../db/models/node-template.model');
    const { argsToJsonSchema, extractOutputSchema } = require('../../ai/tools/tool-converter');
    const tpl = await NodeTemplate.findOne({ key: req.params.key }).lean();
    if (!tpl) return res.apiError(404, 'template_not_found', 'Template not found');
    res.apiOk({
      key: tpl.key,
      name: tpl.title || tpl.name,
      description: tpl.description || '',
      type: tpl.type,
      provider: tpl.providerKey || null,
      argsSchema: tpl.args ? argsToJsonSchema(tpl.args) : null,
      outputSchema: extractOutputSchema(tpl),
      // Fields needed by NodeExecResultDialogComponent for schema-based rendering
      outputSchemas: tpl.outputSchemas || null,
      outputHandles: tpl.outputHandles || null,
      output_array_field: tpl.output_array_field || null,
      output_schema_field: tpl.output_schema_field || null,
    });
  });

  // ══════════════════════════════
  //  AGENTS
  // ══════════════════════════════

  // Available agents (system + custom) for the current workspace
  r.get('/ai/agents/available', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;

    try {
      const Credential = require('../../db/models/credential.model');
      const Provider = require('../../db/models/provider.model');
      const NodeTemplate = require('../../db/models/node-template.model');

      // 1. General agent (always first)
      const agents = [
        { id: 'general', name: 'Général', description: 'Assistant polyvalent', icon: null, type: 'system', toolCount: 0 },
      ];

      // 2. System agents from providers with credentials
      const credentials = await Credential.find({ workspaceId: ws._id }, 'name providerKey').lean();
      const providerKeys = [...new Set(credentials.map(c => c.providerKey))];
      let countMap = new Map();
      if (providerKeys.length) {
        const providers = await Provider.find({ key: { $in: providerKeys } }, 'key name title iconUrl').lean();
        const toolCounts = await NodeTemplate.aggregate([
          { $match: { providerKey: { $in: providerKeys }, enabled: { $ne: false } } },
          { $group: { _id: '$providerKey', count: { $sum: 1 } } },
        ]);
        countMap = new Map(toolCounts.map(t => [t._id, t.count]));

        for (const p of providers) {
          agents.push({
            id: `provider:${p.key}`,
            name: p.title || p.name,
            description: `Spécialiste ${p.title || p.name} (${countMap.get(p.key) || 0} actions)`,
            icon: p.iconUrl || null,
            type: 'system',
            toolCount: countMap.get(p.key) || 0,
          });
        }
      }

      // 3. Custom agents from DB
      const customFilter = { companyId: ws.companyId, enabled: { $ne: false } };
      if (ws._id) customFilter.$or = [{ workspaceId: ws._id }, { workspaceId: { $exists: false } }, { workspaceId: null }];
      const customAgents = await AiAgent.find(customFilter).sort({ createdAt: -1 }).lean();
      for (const a of customAgents) {
        // Count tools from allowed providers
        let customToolCount = 0;
        if (a.allowedProviders?.length) {
          for (const pk of a.allowedProviders) {
            customToolCount += countMap.get(pk) || 0;
          }
        }
        agents.push({
          id: a.id,
          name: a.name,
          description: a.description || '',
          icon: a.icon || null,
          type: 'custom',
          toolCount: customToolCount,
          allowedProviders: a.allowedProviders || [],
          autonomyLevel: a.autonomyLevel || 'autonomous',
        });
      }

      res.apiOk(agents);
    } catch (e) {
      console.error('[ai] agents/available error:', e?.message || e);
      res.apiError(500, 'agents_error', 'Failed to load available agents');
    }
  });

  // List agents (admin)
  r.get('/ai/agents', async (req, res) => {
    const filter = { companyId: req.user.companyId };
    if (req.query.workspaceId) filter.workspaceId = req.query.workspaceId;
    const list = await AiAgent.find(filter).sort({ createdAt: -1 }).lean();
    res.apiOk(list);
  });

  // Create agent
  r.post('/ai/agents', async (req, res) => {
    const { name, description, icon, color, systemPrompt, mode, allowedProviders, allowedTemplateKeys, llmProvider, llmModel, toolGroups, blockedTools, maxToolLoops, routerBehavior, autonomyLevel, workspaceId } = req.body || {};
    if (!name) return res.apiError(400, 'name_required', 'Agent name is required');
    const agent = await AiAgent.create({
      companyId: req.user.companyId,
      workspaceId: workspaceId || undefined,
      name,
      description: description || '',
      icon: icon || '',
      color: color || '',
      systemPrompt: systemPrompt || '',
      mode: mode || 'chat',
      allowedProviders: allowedProviders || [],
      allowedTemplateKeys: allowedTemplateKeys || [],
      llmProvider: llmProvider || undefined,
      llmModel: llmModel || undefined,
      toolGroups: toolGroups || [],
      blockedTools: blockedTools || [],
      maxToolLoops: maxToolLoops || 40,
      routerBehavior: routerBehavior || 'auto',
      autonomyLevel: autonomyLevel || 'autonomous',
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: agent, requestId: req.requestId, ts: Date.now() });
  });

  // Update agent
  r.put('/ai/agents/:agentId', async (req, res) => {
    const agent = await AiAgent.findOne({ id: req.params.agentId, companyId: req.user.companyId });
    if (!agent) return res.apiError(404, 'agent_not_found', 'Agent not found');
    const allowed = ['name', 'description', 'icon', 'color', 'systemPrompt', 'mode', 'allowedProviders', 'allowedTemplateKeys', 'llmProvider', 'llmModel', 'toolGroups', 'blockedTools', 'maxToolLoops', 'routerBehavior', 'autonomyLevel', 'enabled', 'workspaceId'];
    for (const k of allowed) {
      if (req.body[k] !== undefined) agent[k] = req.body[k];
    }
    await agent.save();
    res.apiOk(agent);
  });

  // Delete agent
  r.delete('/ai/agents/:agentId', async (req, res) => {
    const agent = await AiAgent.findOne({ id: req.params.agentId, companyId: req.user.companyId });
    if (!agent) return res.apiError(404, 'agent_not_found', 'Agent not found');
    await AiAgent.deleteOne({ _id: agent._id });
    res.apiOk(true);
  });

  // ── Stats (admin) ──
  r.get('/ai/stats', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;

    try {
      const [threadCount, messageCount, companyCtx, workspaceCtx] = await Promise.all([
        AiThread.countDocuments({ workspaceId: ws._id }),
        AiMessage.countDocuments({}), // approximation — will be filtered by joined threads
        AiCompanyContext.findOne({ companyId: ws.companyId }).lean(),
        AiWorkspaceContext.findOne({ workspaceId: ws._id }).lean(),
      ]);

      // Count messages per workspace via threads
      const threadIds = await AiThread.find({ workspaceId: ws._id }, '_id').lean();
      const tids = threadIds.map(t => t._id);
      const wsMessageCount = tids.length ? await AiMessage.countDocuments({ threadId: { $in: tids } }) : 0;

      // Top tools from user context
      const userCtx = await AiUserContext.findOne({ userId: req.user.id }).lean();
      const toolUsage = userCtx?.toolUsage || {};
      const topTools = Object.entries(toolUsage)
        .map(([name, count]) => ({ name, count: Number(count) || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      res.apiOk({
        threadCount,
        messageCount: wsMessageCount,
        topTools,
        companyContext: companyCtx || {},
        workspaceContext: workspaceCtx || {},
      });
    } catch (e) {
      console.error('[ai] stats error:', e?.message || e);
      res.apiError(500, 'stats_error', 'Failed to load stats');
    }
  });

  // ══════════════════════════════
  //  BACKGROUND AGENTS
  // ══════════════════════════════

  r.post('/ai/threads/:threadId/background', async (req, res) => {
    const thread = await findThread(req.params.threadId);
    if (!thread) return res.apiError(404, 'thread_not_found', 'Thread not found');
    const ws = await Workspace.findById(thread.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'thread_not_found', 'Thread not found');

    const { content, mode, agentId } = req.body || {};
    if (!content) return res.apiError(400, 'empty_content', 'content required');

    // Save user message
    const AiMessage = require('../../db/models/ai-message.model');
    await AiMessage.create({ threadId: thread._id, role: 'user', content });

    // Load history
    const history = await AiMessage.find({ threadId: thread._id }).sort({ createdAt: 1 }).limit(60).lean();
    const messages = [];
    for (const m of history) {
      if (m.role === 'user') {
        // Background agent: resolve attachments if present
        if (m.attachments?.length) {
          try {
            const { resolveAttachments } = require('../../ai/attachments');
            const attBlocks = await resolveAttachments(m.attachments, String(ws._id));
            if (attBlocks.length) {
              const parts = [];
              if (m.content) parts.push({ type: 'text', text: m.content });
              parts.push(...attBlocks);
              messages.push({ role: 'user', content: parts.length === 1 && parts[0].type === 'text' ? m.content : parts });
            } else {
              messages.push({ role: 'user', content: m.content || '' });
            }
          } catch {
            messages.push({ role: 'user', content: m.content || '' });
          }
        } else {
          messages.push({ role: 'user', content: m.content || '' });
        }
      } else if (m.role === 'assistant') {
        if (m.toolCalls?.length) {
          messages.push({
            role: 'assistant',
            content: m.content || null,
            tool_calls: m.toolCalls.map(tc => ({ id: tc.id, name: tc.name, input: tc.args || {} })),
          });
          for (const tc of m.toolCalls) {
            messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(tc.result || {}).slice(0, 3000) });
          }
        } else {
          messages.push({ role: 'assistant', content: m.content || '' });
        }
      }
    }

    // Resolve overrides
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

    // Spawn background agent
    const { spawnBackgroundAgent } = require('../../ai/background-runner');
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

  // Get background run status
  r.get('/ai/runs/:runId', async (req, res) => {
    const AiAgentRun = require('../../db/models/ai-agent-run.model');
    const run = await AiAgentRun.findOne({ id: req.params.runId }).lean();
    if (!run) return res.apiError(404, 'run_not_found', 'Run not found');
    res.apiOk(run);
  });

  // ══════════════════════════════
  //  MCP SERVERS
  // ══════════════════════════════

  // List MCP servers
  r.get('/ai/mcp-servers', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const McpServer = require('../../db/models/mcp-server.model');
    const { mcpRegistry } = require('../../ai/mcp/mcp-registry');
    const servers = await McpServer.find({ workspaceId: ws._id }).sort({ createdAt: -1 }).lean();
    const list = servers.map(s => ({
      ...s,
      status: mcpRegistry.getStatus(s.id || String(s._id)),
    }));
    res.apiOk(list);
  });

  // Add MCP server
  r.post('/ai/mcp-servers', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const McpServer = require('../../db/models/mcp-server.model');
    const { name, transport, command, args, env, url, headers, enabled, autoConnect, toolPrefix } = req.body || {};
    if (!name || !transport) return res.apiError(400, 'invalid', 'name and transport required');
    const server = await McpServer.create({
      workspaceId: ws._id,
      name, transport,
      command: command || undefined,
      args: args || [],
      env: env || {},
      url: url || undefined,
      headers: headers || {},
      enabled: enabled !== false,
      autoConnect: !!autoConnect,
      toolPrefix: toolPrefix || '',
    });
    res.status(201).json({ success: true, data: server, requestId: req.requestId, ts: Date.now() });
  });

  // Update MCP server
  r.put('/ai/mcp-servers/:id', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const McpServer = require('../../db/models/mcp-server.model');
    const server = await McpServer.findOne({ id: req.params.id, workspaceId: ws._id });
    if (!server) return res.apiError(404, 'not_found', 'MCP server not found');
    const allowed = ['name', 'transport', 'command', 'args', 'env', 'url', 'headers', 'enabled', 'autoConnect', 'toolPrefix'];
    for (const k of allowed) {
      if (req.body[k] !== undefined) server[k] = req.body[k];
    }
    await server.save();
    res.apiOk(server);
  });

  // Delete MCP server
  r.delete('/ai/mcp-servers/:id', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const McpServer = require('../../db/models/mcp-server.model');
    const { mcpRegistry } = require('../../ai/mcp/mcp-registry');
    const server = await McpServer.findOne({ id: req.params.id, workspaceId: ws._id });
    if (!server) return res.apiError(404, 'not_found', 'MCP server not found');
    await mcpRegistry.disconnectServer(server.id);
    await McpServer.deleteOne({ _id: server._id });
    res.apiOk(true);
  });

  // Connect MCP server manually
  r.post('/ai/mcp-servers/:id/connect', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const McpServer = require('../../db/models/mcp-server.model');
    const { mcpRegistry } = require('../../ai/mcp/mcp-registry');
    const server = await McpServer.findOne({ id: req.params.id, workspaceId: ws._id }).lean();
    if (!server) return res.apiError(404, 'not_found', 'MCP server not found');
    try {
      await mcpRegistry.connectServer(server);
      res.apiOk({ connected: true, ...mcpRegistry.getStatus(server.id) });
    } catch (e) {
      res.apiError(500, 'connect_error', e.message);
    }
  });

  // Disconnect MCP server
  r.post('/ai/mcp-servers/:id/disconnect', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const { mcpRegistry } = require('../../ai/mcp/mcp-registry');
    await mcpRegistry.disconnectServer(req.params.id);
    res.apiOk({ connected: false });
  });

  // List tools from a specific MCP server
  r.get('/ai/mcp-servers/:id/tools', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const McpServer = require('../../db/models/mcp-server.model');
    const { mcpRegistry } = require('../../ai/mcp/mcp-registry');
    const server = await McpServer.findOne({ id: req.params.id, workspaceId: ws._id }).lean();
    if (!server) return res.apiError(404, 'not_found', 'MCP server not found');
    try {
      const client = await mcpRegistry.connectServer(server);
      const tools = await client.listTools();
      res.apiOk(tools);
    } catch (e) {
      res.apiError(500, 'tools_error', e.message);
    }
  });

  // ── Helper ──
  async function findThread(tid) {
    const id = String(tid);
    if (Types.ObjectId.isValid(id)) {
      const t = await AiThread.findById(id);
      if (t) return t;
    }
    return AiThread.findOne({ id });
  }

  return r;
};
