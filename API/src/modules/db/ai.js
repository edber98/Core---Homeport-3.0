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
    if (req.user.role !== 'admin') {
      const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
      if (!member) {
        res.apiError(403, 'not_a_member', 'Not a workspace member');
        return null;
      }
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

    // ── Subscribe aux events des subagents (jobs async) pour ce thread ──
    // Permet au SSE actif de recevoir canvas.*, ai.permission.*, etc. émis
    // par les spawn_subagent / research_deep qui tournent en parallèle.
    const { onThreadEvent } = require('../../ai/jobs/job-events');
    const unsubThread = onThreadEvent(threadKey, (ev) => {
      if (closed) return;
      try { res.write(`data: ${JSON.stringify(ev)}\n\n`); } catch { /* ignore */ }
    });

    const onClose = () => {
      closed = true;
      clearInterval(heartbeat);
      ac.abort();
      activeStreams.delete(threadKey);
      try { unsubThread(); } catch {}
    };
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
      const hasContent = String(m.content || '').trim().length > 0;
      if (m.role === 'user') {
        if (m.attachments?.length) {
          try {
            const { resolveAttachments } = require('../../ai/attachments');
            const attBlocks = await resolveAttachments(m.attachments, String(ws._id));
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
      } else if (m.role === 'assistant') {
        if (m.toolCalls?.length) {
          // Assistant avec tool_calls : content peut être vide (widget-only).
          // On envoie tout de même le message pour préserver la séquence tool_use/tool_result,
          // mais on omet le champ content si vide (formatMessages gère les 2 cas).
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
        // Assistant sans content ni toolCalls (ex: message widget pur) → skip entièrement.
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

  // ══════════════════════════════
  //  JOBS
  // ══════════════════════════════

  const AiJob = require('../../db/models/ai-job.model');
  const {
    createJob, runJob, resumeJob, pauseJob, cancelJob, onJobEvent,
  } = require('../../ai/jobs/job-runner');
  const { emitJobEvent } = require('../../ai/jobs/job-events');
  const {
    checkPermission, resolvePendingDecision,
  } = require('../../ai/permissions');
  const { requireThreadAccess } = require('../../ai/access/thread-access');

  // Create a job
  r.post('/ai/jobs', async (req, res) => {
    const { threadId, type, mode, subagentType, subagentInstructions, maxLoops, agentId, initiatorMessageId } = req.body || {};
    if (!threadId) return res.apiError(400, 'missing_thread', 'threadId required');
    const thread = await findThread(threadId);
    if (!thread) return res.apiError(404, 'thread_not_found', 'Thread not found');
    const ws = await Workspace.findById(thread.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'thread_not_found', 'Thread not found');
    try {
      const job = await createJob({
        threadId: thread._id,
        type: type || 'agent_run',
        mode, subagentType, subagentInstructions,
        maxLoops, agentId, initiatorMessageId,
      });
      // Fire-and-forget
      setImmediate(() => { runJob(job.id).catch(e => console.error(`[ai/jobs] run error ${job.id}:`, e?.message)); });
      res.status(201).json({ success: true, data: job, requestId: req.requestId, ts: Date.now() });
    } catch (e) {
      res.apiError(500, 'job_create_error', e?.message || 'Failed to create job');
    }
  });

  // Get job
  r.get('/ai/jobs/:jobId', async (req, res) => {
    const job = await AiJob.findOne({ id: req.params.jobId }).lean();
    if (!job) return res.apiError(404, 'job_not_found', 'Job not found');
    const ws = await Workspace.findById(job.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'job_not_found', 'Job not found');
    res.apiOk(job);
  });

  // SSE: stream job events
  r.get('/ai/jobs/:jobId/stream', async (req, res) => {
    const job = await AiJob.findOne({ id: req.params.jobId }).lean();
    if (!job) return res.apiError(404, 'job_not_found', 'Job not found');
    const ws = await Workspace.findById(job.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'job_not_found', 'Job not found');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (res.socket) res.socket.setNoDelay(true);
    res.flushHeaders();

    const send = (obj) => {
      try { res.write(`data: ${JSON.stringify(obj)}\n\n`); if (res.flush) res.flush(); } catch {}
    };
    // Replay last sideEvents if any
    if (Array.isArray(job.sideEvents)) {
      for (const ev of job.sideEvents.slice(-50)) send(ev);
    }
    send({ type: 'job.status', status: job.status, iteration: job.iteration });

    const off = onJobEvent(job.id, (ev) => send(ev));
    const heartbeat = setInterval(() => { try { res.write(':keepalive\n\n'); } catch {} }, 15000);
    const cleanup = () => {
      clearInterval(heartbeat);
      try { off(); } catch {}
      try { res.end(); } catch {}
    };
    req.on('close', cleanup);
    res.on('close', cleanup);
  });

  r.post('/ai/jobs/:jobId/pause', async (req, res) => {
    const job = await AiJob.findOne({ id: req.params.jobId }).lean();
    if (!job) return res.apiError(404, 'job_not_found', 'Job not found');
    const ws = await Workspace.findById(job.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'job_not_found', 'Job not found');
    await pauseJob(job.id);
    res.apiOk({ paused: true });
  });

  r.post('/ai/jobs/:jobId/resume', async (req, res) => {
    const job = await AiJob.findOne({ id: req.params.jobId }).lean();
    if (!job) return res.apiError(404, 'job_not_found', 'Job not found');
    const ws = await Workspace.findById(job.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'job_not_found', 'Job not found');
    setImmediate(() => { resumeJob(job.id).catch(e => console.error('[ai/jobs] resume:', e?.message)); });
    res.apiOk({ resumed: true });
  });

  r.post('/ai/jobs/:jobId/cancel', async (req, res) => {
    const job = await AiJob.findOne({ id: req.params.jobId }).lean();
    if (!job) return res.apiError(404, 'job_not_found', 'Job not found');
    const ws = await Workspace.findById(job.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'job_not_found', 'Job not found');
    await cancelJob(job.id);
    res.apiOk({ cancelled: true });
  });

  // Resolve a pending permission
  r.post('/ai/jobs/:jobId/permissions', async (req, res) => {
    const job = await AiJob.findOne({ id: req.params.jobId });
    if (!job) return res.apiError(404, 'job_not_found', 'Job not found');
    const ws = await Workspace.findById(job.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'job_not_found', 'Job not found');
    const { requestId, decision, pathPattern, scope, toolName, risk, ttlMs } = req.body || {};
    if (!requestId || !decision) return res.apiError(400, 'missing_fields', 'requestId + decision required');

    // Persist grant (for allow_session/allow_always/etc.)
    if (toolName && decision !== 'allow_once' && decision !== 'deny_once') {
      try {
        await resolvePendingDecision({
          threadId: job.threadId,
          workspaceId: job.workspaceId,
          toolName, decision, pathPattern, scope, risk, ttlMs,
          userId: req.user.id,
          jobId: job.id,
        });
      } catch (e) {
        console.error('[permissions] persist error:', e?.message);
      }
    }
    // Notify the running job via pub/sub
    // "always" sans préfixe = "allow_always" (le frontend envoie "always" au
    // lieu de "allow_always" depuis le bouton "Toujours autorisé").
    const rawDecision = String(decision);
    const effectiveDecision = rawDecision === 'always' ? 'allow_always' : rawDecision;
    const normalized = effectiveDecision.startsWith('allow') || effectiveDecision === 'always' ? 'allow' : 'deny';
    console.log(`[perm-resolve] job=${job.id} requestId=${requestId} decision=${decision} (normalized=${normalized})`);
    emitJobEvent(job.id, { type: 'permission.resolved', requestId, decision: normalized });
    // Émet AUSSI sur le parent en tant que subagent.permission.granted pour que
    // le subagent (qui écoute potentiellement via waitForPermissionFromParent) débloque.
    if (job.parentJobId) {
      console.log(`[perm-resolve] also emit subagent.permission.granted on parent=${job.parentJobId}`);
      emitJobEvent(String(job.parentJobId), {
        type: 'subagent.permission.granted',
        requestId,
        childJobId: job.id,
        decision: normalized,
      });
    }

    // Persiste la réponse sur l'AiMessage (card permission_request) pour que le
    // refresh de page conserve l'état "Toujours autorisé / Refusé".
    try {
      await AiMessage.updateOne(
        { threadId: job.threadId, 'metadata.permissionRequest.requestId': requestId },
        {
          $set: {
            'metadata.permissionRequest.answer': decision,
            'metadata.permissionRequest.answeredAt': new Date(),
            'metadata.permissionRequest.answeredBy': req.user.id || req.user._id,
          },
        }
      );
    } catch (e) {
      console.error('[permissions] persist message answer failed:', e?.message);
    }

    // PROPAGATION : si la décision est non-"once" (allow_always / allow_session
    // / deny_always / always), on résout AUSSI toutes les autres demandes de
    // permission en attente dans ce thread pour le MÊME tool. Détachée de la
    // réponse HTTP pour éviter de bloquer la réponse sous charge LLM streaming.
    const isBroadDecision = !['allow_once', 'deny_once'].includes(rawDecision);
    if (isBroadDecision && toolName) {
      setImmediate(async () => {
        try {
          const pendingCards = await AiMessage.find({
            threadId: job.threadId,
            'metadata.kind': 'permission_request',
            'metadata.permissionRequest.toolName': toolName,
            'metadata.permissionRequest.requestId': { $ne: requestId },
            $or: [
              { 'metadata.permissionRequest.answer': { $exists: false } },
              { 'metadata.permissionRequest.answer': null },
            ],
          }).lean();

          // Batch-résolution en parallèle : toutes les cards traitées simultanément
          // au lieu de sérialiser (était un for-loop avec await qui pouvait prendre
          // N×50ms = 500ms+ sous charge).
          const results = await Promise.all(pendingCards.map(async (card) => {
            const pendingRequestId = card?.metadata?.permissionRequest?.requestId;
            const pendingJobId = card?.metadata?.permissionRequest?.jobId;
            if (!pendingRequestId) return false;

            let targetJob = null;
            if (pendingJobId) {
              targetJob = await AiJob.findOne({ id: pendingJobId }, 'id parentJobId').lean();
            }
            if (!targetJob) {
              targetJob = await AiJob.findOne({
                threadId: job.threadId,
                status: 'waiting_permission',
              }, 'id parentJobId').lean();
            }
            if (!targetJob) return false;

            emitJobEvent(targetJob.id, { type: 'permission.resolved', requestId: pendingRequestId, decision: normalized });
            if (targetJob.parentJobId) {
              emitJobEvent(String(targetJob.parentJobId), {
                type: 'subagent.permission.granted',
                requestId: pendingRequestId,
                childJobId: targetJob.id,
                decision: normalized,
              });
            }
            await AiMessage.updateOne(
              { _id: card._id },
              {
                $set: {
                  'metadata.permissionRequest.answer': decision,
                  'metadata.permissionRequest.answeredAt': new Date(),
                  'metadata.permissionRequest.answeredBy': req.user.id || req.user._id,
                  'metadata.permissionRequest.propagatedFrom': requestId,
                },
              }
            );
            return true;
          }));
          const propagated = results.filter(Boolean).length;
          if (propagated > 0) {
            console.log(`[perm-resolve] propagated "${decision}" to ${propagated} other pending ${toolName} requests in thread ${job.threadId}`);
          }
        } catch (e) {
          console.error('[permissions] propagation failed:', e?.message);
        }
      });
    }

    res.apiOk({ ok: true });
  });

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
      // Résolution modèle : override agent > env AI_MODEL > fallback gpt-5.2
      let model = process.env.AI_MODEL || 'gpt-5.2';
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

  // ── Stream SSE passif : reçoit en live les events du thread (subagents async,
  // memory_extractor, agent_report, canvas.*) même en dehors d'un POST /messages.
  // Permet à la page chat ouverte de voir la progression des jobs background.
  r.get('/ai/threads/:threadId/stream', requireThreadAccess('view'), async (req, res) => {
    const thread = req.aiThread;
    const threadKey = String(thread._id);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (res.socket) res.socket.setNoDelay(true);
    res.flushHeaders();

    const send = (obj) => {
      try { res.write(`data: ${JSON.stringify(obj)}\n\n`); if (typeof res.flush === 'function') res.flush(); } catch {}
    };
    send({ type: 'stream.ready', threadId: threadKey });

    const { onThreadEvent } = require('../../ai/jobs/job-events');
    const off = onThreadEvent(threadKey, (ev) => { send(ev); });
    const heartbeat = setInterval(() => { try { res.write(':keepalive\n\n'); } catch {} }, 15000);
    const cleanup = () => {
      clearInterval(heartbeat);
      try { off(); } catch {}
      try { res.end(); } catch {}
    };
    req.on('close', cleanup);
    res.on('close', cleanup);
  });

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

  // ══════════════════════════════
  //  PROJECT ROOT
  // ══════════════════════════════

  const AiProjectRoot = require('../../db/models/ai-project-root.model');

  r.post('/ai/threads/:threadId/project-root', requireThreadAccess('edit'), async (req, res) => {
    const thread = req.aiThread;
    const { connectorType, credentialId, rootPath, label, extraConfig } = req.body || {};
    if (!connectorType) return res.apiError(400, 'connector_required', 'connectorType required');
    // Resolve short ID (cred_xxx) to ObjectId if needed
    let resolvedCredId;
    if (credentialId) {
      if (Types.ObjectId.isValid(credentialId)) {
        resolvedCredId = credentialId;
      } else {
        const Credential = require('../../db/models/credential.model');
        const cred = await Credential.findOne({ id: credentialId }, '_id').lean();
        if (!cred) return res.apiError(404, 'credential_not_found', `Credential '${credentialId}' introuvable`);
        resolvedCredId = cred._id;
      }
    }
    const doc = await AiProjectRoot.findOneAndUpdate(
      { threadId: thread._id },
      {
        $set: {
          workspaceId: thread.workspaceId,
          connectorType,
          credentialId: resolvedCredId || undefined,
          rootPath: rootPath || '/',
          label: label || '',
          extraConfig: extraConfig || {},
        },
        $setOnInsert: { threadId: thread._id },
      },
      { upsert: true, new: true }
    );
    // Mirror lightweight copy in thread metadata
    await AiThread.updateOne({ _id: thread._id }, {
      $set: {
        'metadata.projectRoot': {
          connectorType, credentialId: credentialId || null,
          rootPath: rootPath || '/', label: label || '',
        },
      },
    });
    res.status(201).json({ success: true, data: doc, requestId: req.requestId, ts: Date.now() });
  });

  r.get('/ai/threads/:threadId/project-root', requireThreadAccess('view'), async (req, res) => {
    const doc = await AiProjectRoot.findOne({ threadId: req.aiThread._id }).lean();
    if (!doc) return res.apiError(404, 'not_configured', 'No project root for this thread');
    res.apiOk(doc);
  });

  r.put('/ai/threads/:threadId/project-root', requireThreadAccess('edit'), async (req, res) => {
    const allowed = ['connectorType', 'credentialId', 'rootPath', 'label', 'extraConfig'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    // Resolve short credentialId if needed
    if (patch.credentialId && !Types.ObjectId.isValid(patch.credentialId)) {
      const Credential = require('../../db/models/credential.model');
      const cred = await Credential.findOne({ id: patch.credentialId }, '_id').lean();
      if (!cred) return res.apiError(404, 'credential_not_found', `Credential '${patch.credentialId}' introuvable`);
      patch.credentialId = cred._id;
    }
    const doc = await AiProjectRoot.findOneAndUpdate(
      { threadId: req.aiThread._id },
      { $set: patch },
      { new: true }
    );
    if (!doc) return res.apiError(404, 'not_configured', 'No project root for this thread');
    res.apiOk(doc);
  });

  r.post('/ai/threads/:threadId/project-root/refresh', requireThreadAccess('edit'), async (req, res) => {
    const doc = await AiProjectRoot.findOne({ threadId: req.aiThread._id });
    if (!doc) return res.apiError(404, 'not_configured', 'No project root for this thread');
    try {
      const { createProjectFsExecutor } = require('../../ai/tools/project-fs-tools');
      const exec = createProjectFsExecutor(
        { threadId: req.aiThread._id, workspaceId: req.aiThread.workspaceId, userId: req.user.id, companyId: req.user.companyId },
        () => {}
      );
      const result = await exec.execute('project_refresh_tree', {});
      // Construit un arbre pour le canvas à partir des entrées (flat → tree)
      const entries = (result && result.entries) || [];
      const treeRoot = { name: doc.label || 'Projet', path: '/', type: 'directory', children: [] };
      for (const e of entries) {
        const parts = String(e.path || '').split('/').filter(Boolean);
        let cur = treeRoot;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const partPath = '/' + parts.slice(0, i + 1).join('/');
          const isLast = i === parts.length - 1;
          let next = cur.children.find(c => c.name === part);
          if (!next) {
            next = {
              name: part,
              path: partPath,
              type: isLast ? (e.type || 'file') : 'directory',
              children: [],
            };
            cur.children.push(next);
          }
          cur = next;
        }
      }
      // Persist into AiCanvasState.files pour le panel
      const AiCanvasState = require('../../db/models/ai-canvas-state.model');
      await AiCanvasState.updateOne(
        { threadId: req.aiThread._id },
        {
          $set: {
            'files.rootLabel': doc.label || 'Projet',
            'files.tree': treeRoot.children,
            'files.lastRefreshedAt': new Date(),
          },
          $setOnInsert: { threadId: req.aiThread._id },
        },
        { upsert: true }
      );
      res.apiOk({ tree: treeRoot.children, entries, rootLabel: doc.label || 'Projet' });
    } catch (e) {
      res.apiError(500, 'refresh_error', e?.message || 'Failed to refresh tree');
    }
  });

  r.delete('/ai/threads/:threadId/project-root', requireThreadAccess('edit'), async (req, res) => {
    await AiProjectRoot.deleteOne({ threadId: req.aiThread._id });
    await AiThread.updateOne({ _id: req.aiThread._id }, { $unset: { 'metadata.projectRoot': 1 } });
    res.apiOk({ deleted: true });
  });

  // List connector-capable credentials available in workspace
  r.get('/ai/project-connectors', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const Credential = require('../../db/models/credential.model');
    const Provider = require('../../db/models/provider.model');
    const connectorKeys = ['nextcloudFiles', 'googleDrive', 'dropbox', 'oneDrive', 'sharePoint'];
    const credentials = await Credential.find(
      { workspaceId: ws._id, providerKey: { $in: connectorKeys } },
      'id _id name providerKey'
    ).lean();
    const providers = await Provider.find(
      { key: { $in: connectorKeys } },
      'key name title iconUrl'
    ).lean();
    res.apiOk({
      connectors: providers.map(p => ({
        key: p.key,
        name: p.title || p.name,
        icon: p.iconUrl || null,
        credentials: credentials.filter(c => c.providerKey === p.key)
          .map(c => ({ id: c.id || String(c._id), name: c.name })),
      })),
    });
  });

  // Browse remote path — appelle le NodeTemplate list du connecteur
  r.get('/ai/project-connectors/browse', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const { connectorType, credentialId, path: listPath = '/' } = req.query;
    if (!connectorType || !credentialId) {
      return res.apiError(400, 'missing_params', 'connectorType and credentialId required');
    }
    const { CONNECTOR_MAP } = require('../../ai/tools/project-fs-tools');
    const map = CONNECTOR_MAP[connectorType];
    if (!map || !map.list) {
      return res.apiError(400, 'unsupported_connector', `${connectorType} ne supporte pas le listing`);
    }
    try {
      const { executeTool } = require('../../ai/tools/tool-executor');
      const result = await executeTool(map.list, { path: listPath, credentialId }, {
        workspaceId: ws._id,
        companyId: req.user.companyId,
        userId: req.user.id,
      });
      // Traverse la structure (result peut être wrappé plusieurs niveaux : result.result.files, result.entries, ...)
      function findEntriesArray(obj, depth = 0) {
        if (depth > 4 || !obj) return null;
        for (const key of ['entries', 'files', 'items', 'children', 'contents', 'list']) {
          if (Array.isArray(obj[key])) return obj[key];
        }
        if (Array.isArray(obj)) return obj;
        for (const v of Object.values(obj)) {
          if (v && typeof v === 'object') {
            const found = findEntriesArray(v, depth + 1);
            if (found) return found;
          }
        }
        return null;
      }
      const entries = findEntriesArray(result) || [];
      // Normalise les chemins en RELATIFS (retire préfixes connecteur-spécifiques)
      function stripConnectorPrefix(p) {
        if (typeof p !== 'string') return p;
        // Nextcloud WebDAV: /remote.php/dav/files/<user>/ -> /
        p = p.replace(/^\/?remote\.php\/dav\/files\/[^/]+/, '');
        // S'assure qu'il commence par /
        if (!p.startsWith('/')) p = '/' + p;
        return p;
      }
      const normalized = entries.map(e => {
        const rawPath = e.path || e.fullPath || e.name || '';
        const relPath = stripConnectorPrefix(rawPath);
        const pathEndsSlash = typeof rawPath === 'string' && rawPath.endsWith('/');
        const contentTypeEmpty = e.contentType === '' || e.contentType === null;
        const isDir = e.type === 'folder' || e.type === 'directory'
          || e.isFolder || e.is_dir
          || e.mimeType === 'application/vnd.google-apps.folder'
          || e['.tag'] === 'folder'
          || e.mime === 'httpd/unix-directory'
          || (pathEndsSlash && contentTypeEmpty);
        return {
          name: e.name || e.title || relPath.split('/').filter(Boolean).pop() || '(sans nom)',
          path: relPath,
          type: isDir ? 'directory' : 'file',
          size: typeof e.size === 'number' ? e.size : 0,
          modifiedAt: e.modifiedAt || e.mtime || e.lastModified || e.server_modified || null,
          contentType: e.contentType || e.mimeType || null,
        };
      });
      res.apiOk({ path: listPath, entries: normalized, count: normalized.length });
    } catch (err) {
      res.apiError(500, 'browse_failed', err.message || String(err));
    }
  });

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

      // Roster enrichissement
      let ROSTER = {};
      try { ROSTER = require('../../ai/subagent/roster').ROSTER || {}; } catch {}

      const subagents = subagentJobs.map(j => {
        const info = ROSTER[j.subagentType] || {};
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
          toolCallsCount: Array.isArray(j.result?.artifacts) ? j.result.artifacts.length : 0,
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

  // ══════════════════════════════
  //  PROJECT KNOWLEDGE (structured key/value)
  // ══════════════════════════════

  const AiProjectKnowledge = require('../../db/models/ai-project-knowledge.model');

  // Validation helpers
  const KNOWLEDGE_TYPES = ['text', 'number', 'date', 'url', 'email', 'file', 'list', 'boolean', 'json'];
  const KEY_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;
  const MAX_VALUE_BYTES = 10 * 1024; // 10 KB

  function _valueSize(v) {
    try { return Buffer.byteLength(typeof v === 'string' ? v : JSON.stringify(v ?? ''), 'utf8'); }
    catch { return 0; }
  }

  function _validateEntry(entry) {
    if (!entry || typeof entry !== 'object') return 'entry required';
    const key = typeof entry.key === 'string' ? entry.key.trim() : '';
    if (!key) return 'key required';
    if (!KEY_REGEX.test(key)) return `invalid key "${key}" (alphanumeric + . _ - only, <= 100 chars)`;
    if (entry.type && !KNOWLEDGE_TYPES.includes(entry.type)) return `invalid type "${entry.type}"`;
    if (entry.description && typeof entry.description === 'string' && entry.description.length > 500) {
      return 'description too long (max 500)';
    }
    if (_valueSize(entry.value) > MAX_VALUE_BYTES) return 'value too large (max 10 KB)';
    if (entry.tags && !Array.isArray(entry.tags)) return 'tags must be array';
    if (Array.isArray(entry.tags) && entry.tags.some(t => typeof t !== 'string' || t.length > 40)) {
      return 'invalid tag (string, max 40 chars)';
    }
    return null;
  }

  function _sanitizeEntry(entry, userId) {
    return {
      key: String(entry.key).trim(),
      value: entry.value,
      type: KNOWLEDGE_TYPES.includes(entry.type) ? entry.type : 'text',
      description: entry.description ? String(entry.description).slice(0, 500) : '',
      source: ['manual', 'extracted', 'ai'].includes(entry.source) ? entry.source : 'manual',
      pinned: !!entry.pinned,
      tags: Array.isArray(entry.tags) ? entry.tags.filter(t => typeof t === 'string').map(t => t.slice(0, 40)) : [],
      // Les entries créées manuellement via ces routes sont toujours 'approved'.
      // Seul le subagent memory_extractor crée des 'pending' (via tool direct).
      status: ['pending', 'approved', 'rejected'].includes(entry.status) ? entry.status : 'approved',
      updatedAt: new Date(),
      updatedBy: userId || undefined,
    };
  }

  // GET — full knowledge doc (avec filtre ?status=pending|approved|rejected|all)
  r.get('/ai/threads/:threadId/knowledge', requireThreadAccess('view'), async (req, res) => {
    const doc = await AiProjectKnowledge.findOne({ threadId: req.aiThread._id }).lean();
    const base = doc || { threadId: req.aiThread._id, workspaceId: req.aiThread.workspaceId, entries: [] };
    const statusFilter = typeof req.query?.status === 'string' ? req.query.status : null;
    if (statusFilter && statusFilter !== 'all') {
      // Les entries sans `status` (legacy) sont traitées comme 'approved'.
      const entries = (base.entries || []).filter(e => {
        const st = e.status || 'approved';
        return st === statusFilter;
      });
      return res.apiOk({ ...base, entries });
    }
    res.apiOk(base);
  });

  // GET pending-count — badge UI (rapide, pas de payload entries)
  r.get('/ai/threads/:threadId/knowledge/pending-count', requireThreadAccess('view'), async (req, res) => {
    const doc = await AiProjectKnowledge.findOne({ threadId: req.aiThread._id }, 'entries.status').lean();
    const count = (doc?.entries || []).filter(e => e.status === 'pending').length;
    res.apiOk({ count });
  });

  // POST approve — passe une entry 'pending' → 'approved'
  r.post('/ai/threads/:threadId/knowledge/entries/:entryId/approve', requireThreadAccess('edit'), async (req, res) => {
    const doc = await AiProjectKnowledge.findOne({ threadId: req.aiThread._id });
    if (!doc) return res.apiError(404, 'knowledge_not_found', 'No knowledge doc');
    const entry = doc.entries.id(req.params.entryId);
    if (!entry) return res.apiError(404, 'entry_not_found', 'Entry not found');

    // Optionnel : patch de la valeur avant approbation (modifier avant d'approuver)
    const patch = req.body || {};
    const ALLOWED = ['key', 'value', 'type', 'description', 'tags'];
    for (const k of ALLOWED) {
      if (k in patch) entry[k] = patch[k];
    }
    entry.status = 'approved';
    entry.reviewedAt = new Date();
    entry.reviewedBy = req.user.id;
    entry.updatedAt = new Date();
    entry.updatedBy = req.user.id;
    await doc.save();
    res.apiOk(entry);
  });

  // POST reject — passe une entry 'pending' → 'rejected'
  r.post('/ai/threads/:threadId/knowledge/entries/:entryId/reject', requireThreadAccess('edit'), async (req, res) => {
    const doc = await AiProjectKnowledge.findOne({ threadId: req.aiThread._id });
    if (!doc) return res.apiError(404, 'knowledge_not_found', 'No knowledge doc');
    const entry = doc.entries.id(req.params.entryId);
    if (!entry) return res.apiError(404, 'entry_not_found', 'Entry not found');
    entry.status = 'rejected';
    entry.reviewedAt = new Date();
    entry.reviewedBy = req.user.id;
    await doc.save();
    res.apiOk(entry);
  });

  // PUT — replace all entries
  r.put('/ai/threads/:threadId/knowledge', requireThreadAccess('edit'), async (req, res) => {
    const { entries } = req.body || {};
    if (!Array.isArray(entries)) return res.apiError(400, 'invalid_payload', 'entries[] required');
    // Validate + enforce unique keys
    const seen = new Set();
    for (const e of entries) {
      const err = _validateEntry(e);
      if (err) return res.apiError(400, 'invalid_entry', err);
      if (seen.has(e.key)) return res.apiError(400, 'duplicate_key', `duplicate key "${e.key}"`);
      seen.add(e.key);
    }
    const sanitized = entries.map(e => _sanitizeEntry(e, req.user.id));
    const doc = await AiProjectKnowledge.findOneAndUpdate(
      { threadId: req.aiThread._id },
      { $set: { entries: sanitized, workspaceId: req.aiThread.workspaceId }, $setOnInsert: { threadId: req.aiThread._id } },
      { upsert: true, new: true }
    );
    res.apiOk(doc);
  });

  // POST — add single entry
  r.post('/ai/threads/:threadId/knowledge/entries', requireThreadAccess('edit'), async (req, res) => {
    const entry = req.body || {};
    const err = _validateEntry(entry);
    if (err) return res.apiError(400, 'invalid_entry', err);
    // Reject duplicate key (application-level unique check)
    const existing = await AiProjectKnowledge.findOne(
      { threadId: req.aiThread._id, 'entries.key': entry.key },
      { 'entries.$': 1 }
    ).lean();
    if (existing) return res.apiError(409, 'duplicate_key', `key "${entry.key}" already exists`);
    const sanitized = _sanitizeEntry(entry, req.user.id);
    const doc = await AiProjectKnowledge.findOneAndUpdate(
      { threadId: req.aiThread._id },
      { $push: { entries: sanitized }, $setOnInsert: { workspaceId: req.aiThread.workspaceId, threadId: req.aiThread._id } },
      { upsert: true, new: true }
    );
    const added = doc.entries[doc.entries.length - 1];
    res.apiOk(added);
  });

  // POST /import — bulk import CSV/JSON BEFORE :entryId routes
  r.post('/ai/threads/:threadId/knowledge/import', requireThreadAccess('edit'), async (req, res) => {
    const { format, data, mode } = req.body || {};
    if (!['csv', 'json'].includes(format)) return res.apiError(400, 'invalid_format', 'format must be csv or json');
    if (typeof data !== 'string' && typeof data !== 'object') return res.apiError(400, 'invalid_data', 'data required');

    let imported = [];
    try {
      if (format === 'json') {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.entries) ? parsed.entries : null);
        if (!arr) return res.apiError(400, 'invalid_json', 'JSON must be an array or {entries:[]}');
        imported = arr;
      } else {
        // CSV — very simple parser: first line = headers
        const text = String(data).trim();
        if (!text) return res.apiError(400, 'empty_csv', 'CSV empty');
        const lines = text.split(/\r?\n/);
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const keyIdx = headers.indexOf('key');
        const valueIdx = headers.indexOf('value');
        if (keyIdx < 0 || valueIdx < 0) return res.apiError(400, 'csv_missing_headers', 'CSV must have key,value columns');
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          if (!row.trim()) continue;
          // naive CSV split — values must not contain unescaped commas
          const cells = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          imported.push({
            key: cells[keyIdx],
            value: cells[valueIdx],
            type: cells[headers.indexOf('type')] || 'text',
            description: cells[headers.indexOf('description')] || '',
            tags: (cells[headers.indexOf('tags')] || '').split('|').filter(Boolean),
          });
        }
      }
    } catch (e) {
      return res.apiError(400, 'parse_error', e?.message || 'Failed to parse import data');
    }

    // Validate all
    const errors = [];
    const validated = [];
    for (const e of imported) {
      const err = _validateEntry(e);
      if (err) { errors.push({ key: e?.key, error: err }); continue; }
      validated.push(_sanitizeEntry(e, req.user.id));
    }

    // Apply merge: mode === 'replace' wipes, else upsert by key
    const existingDoc = await AiProjectKnowledge.findOne({ threadId: req.aiThread._id });
    let entries = (mode === 'replace' || !existingDoc) ? [] : [...existingDoc.entries];
    for (const e of validated) {
      const idx = entries.findIndex(x => x.key === e.key);
      if (idx >= 0) entries[idx] = { ...entries[idx].toObject?.() || entries[idx], ...e };
      else entries.push(e);
    }

    const doc = await AiProjectKnowledge.findOneAndUpdate(
      { threadId: req.aiThread._id },
      { $set: { entries, workspaceId: req.aiThread.workspaceId }, $setOnInsert: { threadId: req.aiThread._id } },
      { upsert: true, new: true }
    );
    res.apiOk({ imported: validated.length, total: doc.entries.length, errors });
  });

  // GET /export — download JSON/CSV (static, BEFORE :entryId)
  r.get('/ai/threads/:threadId/knowledge/export', requireThreadAccess('view'), async (req, res) => {
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const doc = await AiProjectKnowledge.findOne({ threadId: req.aiThread._id }).lean();
    const entries = doc?.entries || [];

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="knowledge-${req.aiThread._id}.json"`);
      return res.send(JSON.stringify({ threadId: String(req.aiThread._id), entries }, null, 2));
    }
    // CSV
    const headers = ['key', 'value', 'type', 'description', 'pinned', 'tags'];
    const escape = (v) => {
      const s = v == null ? '' : (typeof v === 'string' ? v : JSON.stringify(v));
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [headers.join(',')];
    for (const e of entries) {
      rows.push([
        escape(e.key), escape(e.value), escape(e.type), escape(e.description),
        escape(e.pinned ? 'true' : 'false'), escape((e.tags || []).join('|')),
      ].join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="knowledge-${req.aiThread._id}.csv"`);
    res.send(rows.join('\n'));
  });

  // PATCH — update a single entry
  r.patch('/ai/threads/:threadId/knowledge/entries/:entryId', requireThreadAccess('edit'), async (req, res) => {
    const patch = req.body || {};
    // If key changed, re-validate and check unique
    const doc = await AiProjectKnowledge.findOne({ threadId: req.aiThread._id });
    if (!doc) return res.apiError(404, 'knowledge_not_found', 'No knowledge doc');
    const entry = doc.entries.id(req.params.entryId);
    if (!entry) return res.apiError(404, 'entry_not_found', 'Entry not found');

    const merged = { ...entry.toObject(), ...patch };
    const err = _validateEntry(merged);
    if (err) return res.apiError(400, 'invalid_entry', err);

    if (patch.key && patch.key !== entry.key) {
      const dup = doc.entries.find(e => String(e._id) !== req.params.entryId && e.key === patch.key);
      if (dup) return res.apiError(409, 'duplicate_key', `key "${patch.key}" already exists`);
    }

    // Apply patch manually (only allowed fields)
    const allowed = ['key', 'value', 'type', 'description', 'pinned', 'tags', 'source', 'status'];
    for (const k of allowed) {
      if (k in patch) {
        if (k === 'status' && !['pending', 'approved', 'rejected'].includes(patch.status)) continue;
        entry[k] = patch[k];
      }
    }
    entry.updatedAt = new Date();
    entry.updatedBy = req.user.id;
    await doc.save();
    res.apiOk(entry);
  });

  // DELETE — remove a single entry
  r.delete('/ai/threads/:threadId/knowledge/entries/:entryId', requireThreadAccess('edit'), async (req, res) => {
    const upd = await AiProjectKnowledge.updateOne(
      { threadId: req.aiThread._id },
      { $pull: { entries: { _id: req.params.entryId } } }
    );
    if (!upd.modifiedCount) return res.apiError(404, 'entry_not_found', 'Entry not found');
    res.apiOk({ deleted: true });
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

  // ── Prompt templates (library réutilisable partagée au workspace) ──
  const AiPromptTemplate = require('../../db/models/ai-prompt-template.model');

  r.get('/ai/prompt-templates', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res); if (!ws) return;
    const q = (req.query.q || '').toString().trim();
    const category = req.query.category;
    const sort = req.query.sort || 'popular';
    const filter = { workspaceId: ws._id, companyId: req.user.companyId };
    // Filtre shared : un user voit SES propres templates privés + tous les shared du workspace
    filter.$or = [{ shared: true }, { createdBy: req.user._id || req.user.id }];
    if (category) filter.category = category;
    if (q) filter.$and = [{ $or: [
      { name: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') },
      { tags: new RegExp(q, 'i') },
    ] }];
    const sortSpec = sort === 'recent' ? { lastUsedAt: -1, updatedAt: -1 }
      : sort === 'alpha' ? { name: 1 }
      : { useCount: -1, updatedAt: -1 };
    const list = await AiPromptTemplate.find(filter).sort(sortSpec).limit(200).lean();
    res.apiOk(list);
  });

  r.post('/ai/prompt-templates', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res); if (!ws) return;
    const { name, description, prompt, category, tags, shared } = req.body || {};
    if (!name || !prompt) return res.apiError(400, 'missing_fields', 'name et prompt requis');
    const doc = await AiPromptTemplate.create({
      workspaceId: ws._id, companyId: req.user.companyId,
      createdBy: req.user._id || req.user.id,
      name: String(name).slice(0, 120),
      description: String(description || '').slice(0, 500),
      prompt: String(prompt).slice(0, 20_000),
      category: category || 'général',
      tags: Array.isArray(tags) ? tags.slice(0, 10).map(t => String(t).slice(0, 40)) : [],
      shared: shared !== false,
    });
    res.apiOk(doc);
  });

  r.put('/ai/prompt-templates/:id', async (req, res) => {
    const tpl = await AiPromptTemplate.findOne({ id: req.params.id, companyId: req.user.companyId });
    if (!tpl) return res.apiError(404, 'not_found', 'Template introuvable');
    if (String(tpl.createdBy) !== String(req.user._id || req.user.id)) {
      return res.apiError(403, 'not_owner', 'Seul le créateur peut modifier');
    }
    const allowed = ['name', 'description', 'prompt', 'category', 'tags', 'shared'];
    for (const k of allowed) if (req.body[k] !== undefined) tpl[k] = req.body[k];
    await tpl.save();
    res.apiOk(tpl);
  });

  r.delete('/ai/prompt-templates/:id', async (req, res) => {
    const tpl = await AiPromptTemplate.findOne({ id: req.params.id, companyId: req.user.companyId });
    if (!tpl) return res.apiError(404, 'not_found', 'Template introuvable');
    if (String(tpl.createdBy) !== String(req.user._id || req.user.id)) {
      return res.apiError(403, 'not_owner', 'Seul le créateur peut supprimer');
    }
    await AiPromptTemplate.deleteOne({ _id: tpl._id });
    res.apiOk({ deleted: true });
  });

  r.post('/ai/prompt-templates/:id/use', async (req, res) => {
    const tpl = await AiPromptTemplate.findOneAndUpdate(
      { id: req.params.id, companyId: req.user.companyId },
      { $inc: { useCount: 1 }, $set: { lastUsedAt: new Date() } },
      { new: true }
    );
    if (!tpl) return res.apiError(404, 'not_found', 'Template introuvable');
    res.apiOk({ prompt: tpl.prompt, name: tpl.name });
  });

  // ── User skills (marketplace interne : code snippets partagés) ──
  const AiUserSkill = require('../../db/models/ai-user-skill.model');

  r.get('/ai/user-skills', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res); if (!ws) return;
    const q = (req.query.q || '').toString().trim();
    const language = req.query.language;
    const sort = req.query.sort || 'popular';
    const filter = { workspaceId: ws._id, companyId: req.user.companyId };
    filter.$or = [{ shared: true }, { createdBy: req.user._id || req.user.id }];
    if (language) filter.language = language;
    if (q) filter.$and = [{ $or: [
      { name: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') },
      { tags: new RegExp(q, 'i') },
    ] }];
    const sortSpec = sort === 'recent' ? { updatedAt: -1 }
      : sort === 'alpha' ? { name: 1 }
      : { useCount: -1, updatedAt: -1 };
    const list = await AiUserSkill.find(filter).sort(sortSpec).limit(200).lean();
    res.apiOk(list);
  });

  r.post('/ai/user-skills', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res); if (!ws) return;
    const { name, description, language, code, tags, shared } = req.body || {};
    if (!name || !code) return res.apiError(400, 'missing_fields', 'name et code requis');
    const doc = await AiUserSkill.create({
      workspaceId: ws._id, companyId: req.user.companyId,
      createdBy: req.user._id || req.user.id,
      name: String(name).slice(0, 120),
      description: String(description || '').slice(0, 500),
      language: language || 'python',
      code: String(code).slice(0, 50_000),
      tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
      shared: shared !== false,
    });
    res.apiOk(doc);
  });

  r.put('/ai/user-skills/:id', async (req, res) => {
    const sk = await AiUserSkill.findOne({ id: req.params.id, companyId: req.user.companyId });
    if (!sk) return res.apiError(404, 'not_found', 'Skill introuvable');
    if (String(sk.createdBy) !== String(req.user._id || req.user.id)) {
      return res.apiError(403, 'not_owner', 'Seul le créateur peut modifier');
    }
    for (const k of ['name', 'description', 'language', 'code', 'tags', 'shared']) {
      if (req.body[k] !== undefined) sk[k] = req.body[k];
    }
    await sk.save();
    res.apiOk(sk);
  });

  r.delete('/ai/user-skills/:id', async (req, res) => {
    const sk = await AiUserSkill.findOne({ id: req.params.id, companyId: req.user.companyId });
    if (!sk) return res.apiError(404, 'not_found', 'Skill introuvable');
    if (String(sk.createdBy) !== String(req.user._id || req.user.id)) {
      return res.apiError(403, 'not_owner', 'Seul le créateur peut supprimer');
    }
    await AiUserSkill.deleteOne({ _id: sk._id });
    res.apiOk({ deleted: true });
  });

  // Fork : duplique un skill existant dans mon propre espace
  r.post('/ai/user-skills/:id/fork', async (req, res) => {
    const src = await AiUserSkill.findOne({ id: req.params.id, companyId: req.user.companyId });
    if (!src) return res.apiError(404, 'not_found', 'Skill introuvable');
    const fork = await AiUserSkill.create({
      workspaceId: src.workspaceId, companyId: src.companyId,
      createdBy: req.user._id || req.user.id,
      name: `${src.name} (fork)`,
      description: src.description,
      language: src.language,
      code: src.code,
      tags: src.tags,
      shared: false, // fork privé par défaut
      forkedFrom: src.id,
    });
    await AiUserSkill.updateOne({ _id: src._id }, { $inc: { forkCount: 1 } });
    res.apiOk(fork);
  });

  r.post('/ai/user-skills/:id/use', async (req, res) => {
    const sk = await AiUserSkill.findOneAndUpdate(
      { id: req.params.id, companyId: req.user.companyId },
      { $inc: { useCount: 1 }, $set: { lastUsedAt: new Date() } },
      { new: true }
    );
    if (!sk) return res.apiError(404, 'not_found', 'Skill introuvable');
    res.apiOk({ code: sk.code, name: sk.name, language: sk.language });
  });

  return r;
};
