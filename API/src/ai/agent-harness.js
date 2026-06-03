// Agent Harness — Orchestrator + Capsule architecture
// Pattern: ~18 primitive tools always visible + capsules activated on demand
// Single LLM loop with dynamic tool injection — no router
//
// Chat mode: starts with primitives only → LLM activates capsules as needed
// Builder modes (workflow/form/node_args): auto-activate relevant capsule
// Manual lookup: search_manual / get_manual_section for detailed reference

const { buildOrchestratorToolSet, getCapsuleInfo, CAPSULE_NAMES } = require('./tool-groups');
const { buildSystemPrompt } = require('./agent-runner');
const { createLlmClient } = require('./llm');
const { trackToolUsage } = require('./context/memory-manager');
const { checkPermission } = require('./permissions');
const { createPreviewSession } = require('./live-preview/preview-parser');
const { detectPreviewType } = require('./live-preview/preview-router');
const { createHarnessLogger } = require('./harness/logger');
const { applySubagentRules } = require('./harness/subagent-rules');
const { detectInfiniteLoop, buildLoopBreakMessage } = require('./harness/anti-loop');
const { drainMailbox } = require('./harness/mailbox');
const { detectHallucinationRisk, buildBlockedResult } = require('./harness/anti-hallucination');
const { injectPreflightTodo, evaluateTodoNudge, buildNudgeMessage, autoCloseStaleTodos } = require('./harness/todo-control');
const { handlePermissionGate } = require('./harness/permission-flow');
const { detectSelfRedundancy, resetLlmChatCounter, buildBlockedResult: buildSelfRedundancyResult } = require('./harness/anti-self-redundancy');
const { handleAskUser } = require('./harness/ask-user-flow');
const { resolveToolLabel, summarizeArgs, summarizeToolArgs } = require('./harness/tool-label');
const { nextWithTimeout, buildCapsuleInstructions, STREAM_TIMEOUT_MS } = require('./harness/stream-utils');
const crypto = require('crypto');
const { isDebug } = require('./util/debug');


// Fallback for onboarding mode
const { runAgent } = require('./agent-runner');

// 100 tours par défaut (était 40). Pour les pipelines avec spawn_subagent +
// dépendances + consolidation + ask_user + multiples retries, 40 saute vite
// et coupe l'agent en plein milieu avec "Limite de boucles atteinte".
const DEFAULT_MAX_LOOPS = parseInt(process.env.AI_DEFAULT_MAX_LOOPS || '100', 10);

/**
 * Main entry point — replaces runAgent() in ai.js.
 * Single orchestrator loop with dynamic capsule activation.
 * Yields the same SSE events as the old runAgent().
 *
 * @param {object} opts
 * @param {string} opts.mode - 'chat' | 'workflow' | 'node_args' | 'form' | 'onboarding'
 * @param {Array} opts.messages
 * @param {object} opts.context
 * @param {object} [opts.metadata]
 * @param {object} [opts.agentOverrides]
 * @yields SSE events
 */
async function* runHarness({ mode, messages, context, metadata, agentOverrides, signal, jobContext }) {
  // Onboarding → fallback to original runAgent
  if (mode === 'onboarding') {
    console.log('[harness] onboarding → original runAgent');
    yield* runAgent({ mode, messages, context, metadata, agentOverrides });
    return;
  }

  // Logger préfixé par jobId pour distinguer agent principal vs sous-agents dans les logs.
  // [harness:1234abcd:main] vs [harness:5678efgh:research:d=1]
  const log = createHarnessLogger(jobContext);

  // Side events queue (patches, snapshots, args from capsule executors)
  const sideEvents = [];
  const emit = (ev) => sideEvents.push(ev);

  // Determine initial capsules based on mode
  const activeCapsules = new Set();
  if (mode === 'workflow') activeCapsules.add('workflow');
  if (mode === 'form') activeCapsules.add('form');
  if (mode === 'node_args') activeCapsules.add('node_args');
  if (mode === 'project') {
    activeCapsules.add('project_fs');
    activeCapsules.add('document');
    activeCapsules.add('code_exec');
    activeCapsules.add('web');
  }
  // Mode chat : capsule web auto-activée pour les recherches / téléchargements
  if (mode === 'chat') {
    activeCapsules.add('web');
  }
  // chat mode: NO capsules initially — LLM activates on demand

  // Load MCP tools for workspace
  let mcpTools = [];
  try {
    if (metadata?.workspaceId) {
      const { mcpRegistry } = require('./mcp/mcp-registry');
      mcpTools = await mcpRegistry.getTools(metadata.workspaceId);
    }
  } catch (e) {
    console.error('[harness] MCP tools load error:', e.message);
  }

  // Build metadata
  const modeMetadata = {
    ...(metadata || {}),
    workspaceId: context.workspaceId || metadata?.workspaceId,
  };
  context._metadata = modeMetadata;
  // Propage threadId + companyId + userId dans le context pour les meta-tools
  // (spawn_subagent, research_deep, render_structured, propose_plan, etc.)
  if (modeMetadata.threadId) context.threadId = modeMetadata.threadId;
  if (modeMetadata.companyId && !context.companyId) context.companyId = modeMetadata.companyId;
  if (modeMetadata.userId && !context.userId) context.userId = modeMetadata.userId;
  // Expose jobContext so meta-tools (spawn_subagent, research_deep) can use it.
  if (jobContext) context._jobContext = jobContext;

  // Build tool set (mutable — supports dynamic capsule activation)
  const toolSet = buildOrchestratorToolSet({
    context,
    metadata: modeMetadata,
    emit,
    activeCapsules,
    blockedTools: agentOverrides?.blockedTools || [],
    allowedTools: agentOverrides?.allowedTools || null,
    mcpTools,
  });

  // Build system prompt (reuses buildSystemPrompt from agent-runner)
  let systemPrompt = buildSystemPrompt(mode, context);
  // Add capsule instructions for chat mode
  if (mode === 'chat') {
    systemPrompt += buildCapsuleInstructions(activeCapsules);
  }
  // Optional custom system prompt from agent override (sub-agent type system prompt, etc.)
  if (agentOverrides?.systemPrompt) {
    systemPrompt += '\n\n## Instructions personnalisées\n' + agentOverrides.systemPrompt;
  }
  // Règles spéciales sous-agent (no chat / format rapport / escalade parent).
  // Cf. harness/subagent-rules.js.
  systemPrompt = applySubagentRules(systemPrompt, jobContext);

  // LLM client (with agent overrides)
  const env = require('../config/env');
  const VLLM_ALIASES = new Set(['vllm', 'ollama', 'lmstudio', 'openai-compatible', 'openai-compat']);
  const resolveProviderConfig = (provider) => {
    const p = String(provider || '').toLowerCase();
    if (p === 'anthropic' || p === 'claude') {
      return { apiKey: env.ANTHROPIC_API_KEY, baseURL: undefined, model: env.ANTHROPIC_MODEL };
    }
    if (VLLM_ALIASES.has(p)) {
      return { apiKey: env.VLLM_API_KEY || 'local', baseURL: env.AI_BASE_URL || undefined, model: env.VLLM_MODEL || env.AI_MODEL };
    }
    return { apiKey: env.OPENAI_API_KEY, baseURL: undefined, model: env.OPENAI_MODEL };
  };
  const llmConfig = { ...context.llmConfig };
  const envForcesProvider = !!process.env.AI_PROVIDER;
  if (agentOverrides?.llmProvider && !envForcesProvider) {
    llmConfig.provider = agentOverrides.llmProvider;
    Object.assign(llmConfig, resolveProviderConfig(agentOverrides.llmProvider));
  }
  if (agentOverrides?.llmModel && !envForcesProvider) llmConfig.model = agentOverrides.llmModel;
  // AI_PROVIDER env force tout : resolve apiKey + baseURL + model selon provider.
  if (envForcesProvider) {
    llmConfig.provider = process.env.AI_PROVIDER;
    Object.assign(llmConfig, resolveProviderConfig(process.env.AI_PROVIDER));
    log.log(`AI_PROVIDER=${process.env.AI_PROVIDER} forcé (agent override ignoré)`);
  }
  const llm = createLlmClient(llmConfig.provider, llmConfig);

  // Build conversation
  const conversation = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  // ── Pré-flight todo_write (cf. harness/todo-control.js)
  injectPreflightTodo(conversation, mode, log);

  const maxLoops = agentOverrides?.maxToolLoops || DEFAULT_MAX_LOOPS;
  let loopCount = 0;
  let totalUsage = { input: 0, output: 0 };

  log.log(`start: mode=${mode}, capsules=[${[...activeCapsules]}], tools=${toolSet.definitions.length}, provider=${llm.provider}, model=${llmConfig.model}`);

  while (loopCount < maxLoops) {
    if (signal?.aborted) { console.log('[harness] aborted before loop', loopCount + 1); break; }
    loopCount++;
    log.log(`loop ${loopCount}/${maxLoops}, tools=${toolSet.definitions.length}`);
    yield { type: 'thinking', iteration: loopCount };

    // ── Mailbox drain : messages reçus pendant l'exécution (cf. harness/mailbox.js)
    // Pour le main agent (pas d'AiJob), on injecte le threadId via metadata pour
    // que drainMailbox puisse lire AiThread.pendingMessages au niveau thread.
    {
      const mailboxCtx = jobContext || { threadId: modeMetadata?.threadId };
      const drained = await drainMailbox(mailboxCtx, log);
      if (drained) {
        conversation.push(drained.message);
        yield { type: 'mailbox.delivered', count: drained.count };
      }
    }

    let stream;
    try {
      stream = llm.stream(conversation, toolSet.definitions);
    } catch (streamInitErr) {
      console.error('[harness] LLM stream init error:', streamInitErr?.message || streamInitErr);
      throw streamInitErr;
    }

    const pendingToolCalls = [];
    const toolInputBuffers = new Map();   // id → accumulated JSON string
    const toolMetaResolved = new Set();   // ids where tool.meta already sent
    const previewSessions = new Map();    // id → preview parser session (ui.preview.delta)
    let assistantText = '';
    let eventCount = 0;

    // Manual iteration with per-event timeout (replaces for-await)
    const it = stream[Symbol.asyncIterator]();
    try {
      while (true) {
        if (signal?.aborted) break;
        // Yield to event loop toutes les 5 events pour éviter la starvation
        // pendant le streaming des args d'un tool (execute_code peut émettre
        // 1000+ chunks). Sans ça, les autres requêtes HTTP attendent 2-3s.
        if (eventCount > 0 && eventCount % 5 === 0) {
          await new Promise(r => setImmediate(r));
          if (signal?.aborted) break;
        }
        const { done, value: event } = await nextWithTimeout(it, STREAM_TIMEOUT_MS, signal);
        if (done) break;
        eventCount++;

        switch (event.type) {
          case 'text_delta':
            assistantText += event.text;
            yield { type: 'message', text: event.text };
            break;
          case 'tool_use_start':
            log.log(`stream: tool_use_start → ${event.name} (id=${event.id})`);
            yield { type: 'tool.start', id: event.id, name: event.name };
            // Init live-preview session si le tool est concerné (render_structured, generate_diagram, etc.)
            {
              const pvType = detectPreviewType(event.name);
              if (pvType && !previewSessions.has(event.id)) {
                previewSessions.set(event.id, {
                  session: createPreviewSession(event.id, event.name),
                  previewType: pvType,
                  started: false,
                });
              }
            }
            break;
          case 'tool_input_delta': {
            // Accumulate JSON for early key detection
            let buf = toolInputBuffers.get(event.id) || '';
            buf += event.text;
            toolInputBuffers.set(event.id, buf);
            // Log seulement si AI_DEBUG=1 (trop verbeux sur les gros args)
            if (isDebug()) log.log(`stream: tool_input_delta → ${event.name} +${event.text.length}chars (id=${event.id}), buf=${buf.length}chars`);

            yield { type: 'tool.input_delta', id: event.id, name: event.name, text: event.text };

            // ── Live preview: emit `ui.preview.delta` with incremental JSON patch
            {
              const pv = previewSessions.get(event.id);
              if (pv) {
                try {
                  const out = pv.session.apply(event.text);
                  if (out) {
                    if (!pv.started) {
                      pv.started = true;
                      yield {
                        type: 'ui.preview.start',
                        toolId: event.id,
                        toolName: event.name,
                        previewType: pv.previewType,
                      };
                    }
                    yield {
                      type: 'ui.preview.delta',
                      toolId: event.id,
                      toolName: event.name,
                      previewType: pv.previewType,
                      patch: out.patch,
                      // Snapshot inclus pour permettre au front de récupérer l'état complet
                      // sans appliquer manuellement chaque patch si worker indispo.
                      state: out.state,
                    };
                  }
                } catch (pvErr) {
                  // Ne jamais casser le stream à cause d'une preview
                  console.warn('[harness] preview apply error:', pvErr?.message);
                }
              }
            }

            // Early detection: for execute_tool, extract "key" from partial JSON
            if (event.name === 'execute_tool' && !toolMetaResolved.has(event.id)) {
              const keyMatch = buf.match(/"key"\s*:\s*"([^"]+)"/);
              if (keyMatch) {
                toolMetaResolved.add(event.id);
                const templateKey = keyMatch[1];
                log.log(`early key detected: "${templateKey}" — looking up NodeTemplate`);
                try {
                  const NodeTemplate = require('../db/models/node-template.model');
                  const tpl = await NodeTemplate.findOne({ key: templateKey }, 'title name args').lean();
                  if (tpl) {
                    const { flattenFields } = require('./tools/tool-converter');
                    const displayTitle = tpl.title || tpl.name || templateKey;
                    const fields = flattenFields(tpl.args?.fields || []);
                    const argsSchema = fields.filter(f => f.key).map(f => ({
                      key: f.key, label: f.label || f.title || f.key
                    }));
                    log.log(`→ tool.meta: "${displayTitle}", ${argsSchema.length} fields`);
                    yield { type: 'tool.meta', id: event.id, displayTitle, argsSchema };
                  } else {
                    log.log(`→ NodeTemplate not found for key="${templateKey}"`);
                  }
                } catch (e) {
                  console.error('[harness] early meta resolve error:', e.message);
                }
              }
            }
            break;
          }
          case 'tool_use_end': {
            log.log(`stream: tool_use_end → ${event.name} (id=${event.id})`);
            const tcEntry = { id: event.id, name: event.name, input: event.input };
            // Fallback: key wasn't detected during deltas (e.g., no deltas streamed)
            if (event.name === 'execute_tool' && event.input?.key && !toolMetaResolved.has(event.id)) {
              try {
                const NodeTemplate = require('../db/models/node-template.model');
                const tpl = await NodeTemplate.findOne({ key: event.input.key }, 'title name args').lean();
                if (tpl) {
                  const { flattenFields } = require('./tools/tool-converter');
                  tcEntry._displayTitle = tpl.title || tpl.name || event.input.key;
                  const fields = flattenFields(tpl.args?.fields || []);
                  const argsSchema = fields.filter(f => f.key).map(f => ({
                    key: f.key, label: f.label || f.title || f.key
                  }));
                  yield { type: 'tool.meta', id: event.id, displayTitle: tcEntry._displayTitle, argsSchema };
                }
              } catch (e) {
                console.error('[harness] title fallback error:', e.message);
              }
            }
            // Signal frontend: args are complete → transition building → running
            yield { type: 'tool.building_done', id: event.id };
            // Flush live preview avec l'état final si session active
            {
              const pv = previewSessions.get(event.id);
              if (pv && pv.started) {
                yield {
                  type: 'ui.preview.building_done',
                  toolId: event.id,
                  toolName: event.name,
                  previewType: pv.previewType,
                  state: pv.session.state,
                };
              }
            }
            pendingToolCalls.push(tcEntry);
            break;
          }
          case 'done':
            if (event.usage) {
              totalUsage.input += event.usage.input || 0;
              totalUsage.output += event.usage.output || 0;
            }
            log.log(`stream: done (events=${eventCount}, usage=${JSON.stringify(event.usage || {})})`);
            break;
          default:
            log.log(`stream: unknown event type "${event.type}"`);
            break;
        }
      }
    } catch (streamErr) {
      // Client disconnected — clean exit
      if (streamErr?.message === 'Stream aborted') {
        log.log(`stream aborted by client after ${eventCount} events`);
        await toolSet.cleanup();
        yield { type: 'done', usage: totalUsage };
        return;
      }
      log.error(`stream error after ${eventCount} events:`, streamErr?.message || streamErr);
      // If we got text, yield what we have before throwing
      if (assistantText && pendingToolCalls.length === 0) {
        await toolSet.cleanup();
        yield { type: 'done', usage: totalUsage };
        return;
      }
      throw streamErr;
    }

    log.log(`stream complete: events=${eventCount}, text=${assistantText.length}chars, pendingTools=${pendingToolCalls.length}`);

    // Client disconnected mid-stream → stop immediately
    if (signal?.aborted) {
      console.log('[harness] aborted after stream, cleaning up');
      await toolSet.cleanup();
      yield { type: 'done', usage: totalUsage };
      return;
    }

    // No tool calls → l'agent a fini sa réponse. On sort du loop.
    // (Ancien nudge "empty promise" supprimé : causait des boucles infinies
    // quand le LLM reproduisait le même pattern — + empêchait le resume
    // verrouillé de juste écrire du texte sans tool.)
    if (pendingToolCalls.length === 0) {
      await toolSet.cleanup();
      // Ferme les todos in_progress/pending qui traînent (le LLM a fini sans les clore)
      const tid = modeMetadata.threadId || context._threadId;
      if (tid) await autoCloseStaleTodos(String(tid), log);
      yield { type: 'done', usage: totalUsage };
      return;
    }

    // ── Nudge todo_write (cf. harness/todo-control.js)
    const { shouldNudge: shouldNudgeTodo, heavyCount } = evaluateTodoNudge(pendingToolCalls, jobContext, log);

    // ── Garde anti-hallucination (cf. harness/anti-hallucination.js)
    const { blockedIds: blockedFinalizerIds, hasAsyncSpawn } =
      await detectHallucinationRisk(pendingToolCalls, modeMetadata.threadId || context._threadId, log);

    // Execute tools
    const toolResults = [];
    for (const tc of pendingToolCalls) {
      if (signal?.aborted) { console.log('[harness] aborted before tool:', tc.name); break; }
      const startTime = Date.now();
      log.log(`tool: ${tc.name}`, JSON.stringify(tc.input || {}).slice(0, 500));

      // ── Permission gate (cf. harness/permission-flow.js)
      const permResult = yield* handlePermissionGate({
        toolCall: tc, jobContext, context, modeMetadata, log,
        blockedFinalizerIds, toolResults,
      });
      if (permResult.shouldSkipTool) continue;

      // ── Anti self-redundancy (cf. harness/anti-self-redundancy.js)
      // L'agent NE DOIT PAS appeler openai_chat_completion / anthropic_chat etc.
      // pour des micro-questions qu'il peut résoudre lui-même.
      const sr = detectSelfRedundancy(tc, jobContext, conversation);
      if (sr.blocked) {
        log.warn(`anti-self-redundancy: BLOCKED ${tc.input?.key} — ${sr.reason.slice(0, 100)}`);
        const blockResult = buildSelfRedundancyResult(tc.name, sr.reason);
        toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(blockResult), status: 'error', duration: 0 });
        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result: blockResult, status: 'error', duration: 0 };
        continue;
      }
      // Si on appelle un tool différent d'un LLM-chat, on reset le compteur.
      // Le compteur ne croît que sur les appels LLM-chat consécutifs.
      if (tc.name !== 'execute_tool' || !require('./harness/anti-self-redundancy').LLM_CHAT_TOOLS.has(String(tc.input?.key || ''))) {
        resetLlmChatCounter(jobContext);
      }

      try {
        const result = await toolSet.execute(tc.name, tc.input, { toolId: tc.id, toolName: tc.name });
        const duration = Date.now() - startTime;

        // ── Handle capsule activation ──
        if (result?._capsuleRequest) {
          const { capsule, reason } = result;
          const activation = toolSet.activateCapsule(capsule);
          log.log(`capsule ${capsule}:`, JSON.stringify(activation));

          const capsuleInfo = getCapsuleInfo()[capsule];
          const response = activation.activated
            ? {
              ok: true,
              message: `Capsule "${capsule}" activée. ${capsuleInfo?.toolCount || ''} outils disponibles. ` +
                `IMPORTANT : ces outils sont maintenant des tool calls DIRECTS. ` +
                `Appelle-les DIRECTEMENT (ex: create_flow, add_node). ` +
                `NE PAS utiliser search_tools ou get_tool_details pour ces outils.`,
              newTools: activation.newTools,
            }
            : activation.alreadyActive
              ? { ok: true, message: `Capsule "${capsule}" déjà active. Utilise les outils DIRECTEMENT.` }
              : { ok: false, error: activation.error || `Impossible d'activer "${capsule}".` };

          const capsuleStatus = response.ok === false ? 'error' : 'success';
          toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(response), status: capsuleStatus, duration });
          yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result: response, status: capsuleStatus, duration };
          continue;
        }

        // ── Normal tool result ──
        // Use pre-resolved displayTitle (from tool_use_end DB lookup), fallback to _displayTitle side-channel
        let displayTitle = tc._displayTitle;
        if (result?._displayTitle) {
          if (!displayTitle) displayTitle = result._displayTitle;
          delete result._displayTitle; // Clean up before LLM serialization
        }
        const toolStatus = result?.ok === false ? 'error' : 'success';
        log.log(`tool ${tc.name} ${toolStatus} (${duration}ms), displayTitle="${displayTitle || 'none'}":`, JSON.stringify(result || {}).slice(0, 300));
        toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(result), status: toolStatus, duration, result });
        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result, status: toolStatus, duration, displayTitle };

        // ── Tracking todo_write : si un item est in_progress, on accumule les
        // tools pour les attacher à l'item au prochain todo_write.
        if (jobContext && tc.name !== 'todo_write') {
          if (!jobContext._todoPendingTools) jobContext._todoPendingTools = [];
          const argsSummary = summarizeToolArgs(tc.name, tc.input);
          const entry = {
            name: tc.name,
            status: toolStatus,
            duration,
            argsSummary,
            at: new Date(),
          };
          // Enrichit avec roster si spawn_subagent
          if (tc.name === 'spawn_subagent' && tc.input?.subagent_type) {
            try {
              const { getAgent } = require('./subagent/roster');
              const info = getAgent(tc.input.subagent_type);
              if (info) {
                entry.agentName = info.name;
                entry.agentEmoji = info.emoji;
                entry.agentColor = info.color;
                entry.subagentType = tc.input.subagent_type;
              }
            } catch {}
            // Mémorise le jobId du subagent spawné pour que le frontend puisse
            // lier le todo item au rapport agent_report quand il arrivera.
            if (result?.result?.jobId) entry.spawnedJobId = result.result.jobId;
            else if (result?.jobId) entry.spawnedJobId = result.jobId;
          }
          jobContext._todoPendingTools.push(entry);
        }

        // Action events (open_credentials, etc.)
        if (result?._action) {
          yield { type: 'action', action: result.action, providerKey: result.providerKey, providerName: result.providerName };
        }

        // Track tool usage for analytics
        if (tc.name === 'execute_tool' && tc.input?.key && context.userId) {
          trackToolUsage(context.userId, tc.input.key, context.companyId).catch(() => {});
        }

        // Drain side events from capsule executors
        for (const ev of sideEvents) yield ev;
        sideEvents.length = 0;

      } catch (e) {
        const duration = Date.now() - startTime;
        const errMsg = e?.message || String(e);
        log.error(`tool ${tc.name} ERROR (${duration}ms):`, errMsg);
        toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify({ error: errMsg }), status: 'error', duration });
        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, error: errMsg, status: 'error', duration, displayTitle: tc._displayTitle };

        // Still drain side events
        for (const ev of sideEvents) yield ev;
        sideEvents.length = 0;
      }
    }

    // ── ask_user flow (cf. harness/ask-user-flow.js)
    {
      const askResult = yield* handleAskUser({
        pendingToolCalls, toolResults, jobContext, context, modeMetadata,
        conversation, toolSet, log, totalUsage, loopCount, assistantText,
      });
      if (askResult.kind === 'continue') continue;
      if (askResult.kind === 'return') return;
    }

    // Add assistant message + tool results to conversation
    conversation.push({
      role: 'assistant',
      content: assistantText || null,
      tool_calls: pendingToolCalls.map(tc => ({ id: tc.id, name: tc.name, input: tc.input })),
    });
    for (const tr of toolResults) {
      // Si le tool a retourné des _contentBlocks (image/document/audio), les propager au LLM
      // pour qu'il lise nativement via sa vision/audio (pattern Claude Code / Codex).
      // Chaque provider LLM (anthropic/openai/openai-responses) convertit les blocks
      // vers son format natif (image, document PDF, input_file, input_audio).
      const resultObj = tr.result;
      const blocks = Array.isArray(resultObj?._contentBlocks) ? resultObj._contentBlocks : null;
      const MULTIMODAL_TYPES = new Set(['image', 'document', 'audio', 'input_audio']);
      if (blocks && blocks.length) {
        const contentParts = [{ type: 'text', text: tr.content }];
        for (const b of blocks) {
          if (MULTIMODAL_TYPES.has(b.type)) contentParts.push(b);
        }
        conversation.push({ role: 'tool', tool_call_id: tr.id, content: contentParts });
      } else {
        conversation.push({ role: 'tool', tool_call_id: tr.id, content: tr.content });
      }
    }

    // ── Détecteur de boucle infinie (cf. harness/anti-loop.js)
    if (detectInfiniteLoop(jobContext, toolResults)) {
      log.warn(`BOUCLE INFINIE DÉTECTÉE : même tool+erreur 3x consécutifs (${toolResults[0]?.name}). Force stop.`);
      conversation.push(buildLoopBreakMessage(toolResults[0]?.name));
      try { await jobContext.persistCheckpoint(loopCount, conversation); } catch {}
      await toolSet.cleanup();
      yield { type: 'done', usage: totalUsage };
      return;
    }

    // Injection du nudge todo_write si détecté (après exécution des tools)
    if (shouldNudgeTodo) conversation.push(buildNudgeMessage(heavyCount));

    // ── Tracking des spawns déjà lancés (anti-doublon) ────────────────
    // Au lieu d'un FORCE STOP (qui coupe le texte de narration et empêche
    // les spawns suivants), on mémorise les subagents déjà spawnés. Si le
    // LLM tente de re-spawner le même type avec un prompt quasi-identique
    // au prochain tour, le spawn sera bloqué au niveau du tool handler.
    if (hasAsyncSpawn && jobContext) {
      if (!jobContext._spawnedSubagentIds) jobContext._spawnedSubagentIds = new Set();
      for (const tr of toolResults) {
        if (tr.name === 'spawn_subagent' && tr.status !== 'error' && tr.result) {
          try {
            const parsed = typeof tr.result === 'string' ? JSON.parse(tr.result) : tr.result;
            const jid = parsed?.result?.jobId || parsed?.jobId;
            if (jid) jobContext._spawnedSubagentIds.add(jid);
          } catch {}
        }
      }
      log.log(`spawned subagents so far: ${jobContext._spawnedSubagentIds.size}`);
    }

    // Checkpoint + heartbeat (no-op without jobContext)
    if (jobContext) {
      try { await jobContext.persistCheckpoint(loopCount, conversation); } catch { /* non-fatal */ }
      try { await jobContext.heartbeat(); } catch { /* non-fatal */ }
    }
    log.log(`end of loop ${loopCount}/${maxLoops} — will ${loopCount < maxLoops ? 'continue' : 'STOP (maxLoops reached)'}`);
  }

  // Max loops reached
  log.log(`maxLoops=${maxLoops} reached → cleanup + done`);
  await toolSet.cleanup();
  const tidEnd = modeMetadata.threadId || context._threadId;
  if (tidEnd) await autoCloseStaleTodos(String(tidEnd), log);
  yield { type: 'message', text: '\n\n*Limite de boucles atteinte. Reformule ta demande si nécessaire.*' };
  yield { type: 'done', usage: totalUsage };
}

module.exports = { runHarness };
