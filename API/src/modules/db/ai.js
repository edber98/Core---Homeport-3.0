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
const { toolIndex } = require('../../ai/tools/tool-index');

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

Quand l'utilisateur demande une action liée à ${provider.name}, utilise directement les outils ci-dessus via \`execute_tool\` avec la clé correspondante. Propose des solutions concrètes en utilisant ces outils plutôt que des explications théoriques.`;

      return { promptFragment };
    }

    // Custom agent: aia_xxx
    const agent = await AiAgent.findOne({ id: agentId }).lean();
    if (!agent) return null;
    return {
      promptFragment: agent.systemPrompt || null,
      llmProvider: agent.llmProvider || null,
      llmModel: agent.llmModel || null,
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
    if (req.query.flowId) filter.flowId = req.query.flowId;
    const list = await AiThread.find(filter).sort({ updatedAt: -1 }).limit(50).lean();
    res.apiOk(list);
  });

  // Create thread
  r.post('/ai/threads', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const { mode, title, flowId, nodeId, agentId, metadata } = req.body || {};
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
    const thread = await AiThread.create({
      companyId: ws.companyId,
      workspaceId: ws._id,
      userId: req.user.id,
      mode: mode || 'chat',
      title: title || 'Chat',
      flowId: resolvedFlowId,
      nodeId: nodeId || undefined,
      agentId: agentId || undefined,
      metadata: metadata || undefined,
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
    const history = await AiMessage.find({ threadId: thread._id }).sort({ createdAt: 1 }).limit(60).lean();
    const messages = [];
    for (const m of history) {
      if (m.role === 'user') {
        messages.push({ role: 'user', content: m.content || '' });
      } else if (m.role === 'assistant') {
        // Include tool calls in assistant messages so LLM sees previous results
        if (m.toolCalls?.length) {
          messages.push({
            role: 'assistant',
            content: m.content || null,
            tool_calls: m.toolCalls.map(tc => ({ id: tc.id, name: tc.name, input: tc.args || {} })),
          });
          // Add tool results as separate messages
          for (const tc of m.toolCalls) {
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result || {}),
            });
          }
        } else {
          messages.push({ role: 'assistant', content: m.content || '' });
        }
      } else {
        messages.push({ role: m.role, content: m.content || '' });
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

    // Load agent overrides if agentId is set (dynamic provider or custom)
    let agentOverrides = null;
    if (thread.agentId) {
      const resolved = await resolveAgentOverrides(thread.agentId, context);
      if (resolved) {
        // Inject prompt fragment into context for buildSystemPrompt
        if (resolved.promptFragment) {
          context._agentPromptFragment = resolved.promptFragment;
        }
        // Pass LLM overrides if custom agent specifies them
        if (resolved.llmProvider || resolved.llmModel) {
          agentOverrides = {
            llmProvider: resolved.llmProvider || null,
            llmModel: resolved.llmModel || null,
          };
        }
      }
    }

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
    req.on('close', () => { closed = true; clearInterval(heartbeat); });

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

      const generator = runAgent({
        mode: thread.mode || 'chat',
        messages,
        context,
        metadata,
        agentOverrides,
      });

      for await (const event of generator) {
        if (closed) break;

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
            send(event);
            break;

          case 'tool.end': {
            const tc = { id: event.id, name: event.name, args: event.args, result: event.result, duration: event.duration, status: event.status };
            toolCalls.push(tc);
            // Update the tool in its tools segment
            for (const seg of segments) {
              if (seg.type !== 'tools' || !seg.toolCalls) continue;
              const idx = seg.toolCalls.findIndex(t => t.id === event.id);
              if (idx >= 0) { seg.toolCalls[idx] = tc; break; }
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

          // Side events from mode-specific tools (patches, args, etc.)
          case 'patch':
          case 'snapshot':
          case 'args':
          case 'desc':
            send(event);
            break;

          case 'done':
            doneSent = true;
            send(event);
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
          segments: cleanSegments.length > 1 ? cleanSegments : undefined,
          question: questionData ? { text: questionData.text, questionType: questionData.questionType, options: questionData.options } : undefined,
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
      if (!doneSent) send({ type: 'done' });
      try { res.end(); } catch {}
    }
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
      if (providerKeys.length) {
        const providers = await Provider.find({ key: { $in: providerKeys } }, 'key name title iconUrl').lean();
        const toolCounts = await NodeTemplate.aggregate([
          { $match: { providerKey: { $in: providerKeys }, enabled: { $ne: false } } },
          { $group: { _id: '$providerKey', count: { $sum: 1 } } },
        ]);
        const countMap = new Map(toolCounts.map(t => [t._id, t.count]));

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
        agents.push({
          id: a.id,
          name: a.name,
          description: a.description || '',
          icon: a.icon || null,
          type: 'custom',
          toolCount: 0,
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
    const { name, description, icon, color, systemPrompt, mode, allowedProviders, allowedTemplateKeys, llmProvider, llmModel, workspaceId } = req.body || {};
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
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: agent, requestId: req.requestId, ts: Date.now() });
  });

  // Update agent
  r.put('/ai/agents/:agentId', async (req, res) => {
    const agent = await AiAgent.findOne({ id: req.params.agentId, companyId: req.user.companyId });
    if (!agent) return res.apiError(404, 'agent_not_found', 'Agent not found');
    const allowed = ['name', 'description', 'icon', 'color', 'systemPrompt', 'mode', 'allowedProviders', 'allowedTemplateKeys', 'llmProvider', 'llmModel', 'enabled', 'workspaceId'];
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
