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
const crypto = require('crypto');

// Fallback for onboarding mode
const { runAgent } = require('./agent-runner');

function _summarizeArgs(args, maxChars = 300) {
  try {
    const s = JSON.stringify(args || {});
    return s.length > maxChars ? s.slice(0, maxChars) + '…' : s;
  } catch { return String(args || ''); }
}

const DEFAULT_MAX_LOOPS = 40;
const STREAM_TIMEOUT_MS = 120_000; // 120s per-event timeout

/**
 * Read next value from async iterator with timeout + abort signal.
 * Rejects immediately if signal is aborted or fires abort during wait.
 */
function nextWithTimeout(iterator, timeoutMs, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Stream aborted'));

    const timer = setTimeout(
      () => reject(new Error(`LLM stream timeout: no event for ${timeoutMs / 1000}s`)),
      timeoutMs,
    );

    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Stream aborted'));
    };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });

    iterator.next().then(
      r => { if (!settled) { settled = true; cleanup(); resolve(r); } },
      e => { if (!settled) { settled = true; cleanup(); reject(e); } },
    );
  });
}

/**
 * Build capsule instructions for the system prompt (chat mode only).
 */
function buildCapsuleInstructions(activeCapsules) {
  const info = getCapsuleInfo();
  const lines = Object.entries(info).map(([name, i]) => {
    const active = activeCapsules.has(name) ? ' (ACTIVE)' : '';
    return `- **${name}** : ${i.description} (${i.toolCount})${active}`;
  });

  return `

## Capsules d'outils

Tu disposes d'un set de base (~18 outils) toujours disponibles.
Pour des tâches spécialisées, active une capsule avec \`activate_capsule\`.

### Capsules disponibles
${lines.join('\n')}

### Quand activer
- **workflow** : Créer ou modifier un workflow/automatisation
- **form** : Créer ou modifier un formulaire
- **node_args** : Configurer les arguments d'un nœud

### Règles
- **PAS de capsule** pour : questions simples, mémoire, exécutions directes (search_tools → execute_tool)
- Active **DÈS** que nécessaire, ne demande pas la permission
- Après activation, les outils de la capsule deviennent des **TOOL CALLS DIRECTS** dans ta liste d'outils
- **APPELLE-LES DIRECTEMENT** : \`create_flow\`, \`add_node\`, \`connect_nodes\`, etc. — comme n'importe quel autre tool call
- **INTERDIT** : \`search_tools("create_flow")\` ou \`get_tool_details("add_node")\` — ces outils builder ne sont PAS des NodeTemplates
- \`search_tools\` / \`get_tool_details\` = cherche les **NodeTemplates** (actions plugin : Odoo, Slack, Email…)
- Les outils builder = **commandes directes** déjà dans ta liste d'outils après activation
- Après activation, utilise \`search_manual\` pour récupérer les règles détaillées du mode`;
}

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
  // Expose jobContext so meta-tools (spawn_subagent, research_deep) can use it.
  if (jobContext) context._jobContext = jobContext;

  // Build tool set (mutable — supports dynamic capsule activation)
  const toolSet = buildOrchestratorToolSet({
    context,
    metadata: modeMetadata,
    emit,
    activeCapsules,
    blockedTools: agentOverrides?.blockedTools || [],
    mcpTools,
  });

  // Build system prompt (reuses buildSystemPrompt from agent-runner)
  let systemPrompt = buildSystemPrompt(mode, context);
  // Add capsule instructions for chat mode
  if (mode === 'chat') {
    systemPrompt += buildCapsuleInstructions(activeCapsules);
  }

  // LLM client (with agent overrides)
  const env = require('../config/env');
  const llmConfig = { ...context.llmConfig };
  if (agentOverrides?.llmProvider) {
    llmConfig.provider = agentOverrides.llmProvider;
    const p = agentOverrides.llmProvider.toLowerCase();
    llmConfig.apiKey = (p === 'anthropic' || p === 'claude') ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;
  }
  if (agentOverrides?.llmModel) llmConfig.model = agentOverrides.llmModel;
  const llm = createLlmClient(llmConfig.provider, llmConfig);

  // Build conversation
  const conversation = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const maxLoops = agentOverrides?.maxToolLoops || DEFAULT_MAX_LOOPS;
  let loopCount = 0;
  let totalUsage = { input: 0, output: 0 };

  console.log(`[harness] start: mode=${mode}, capsules=[${[...activeCapsules]}], tools=${toolSet.definitions.length}, provider=${llm.provider}, model=${llmConfig.model}`);

  while (loopCount < maxLoops) {
    if (signal?.aborted) { console.log('[harness] aborted before loop', loopCount + 1); break; }
    loopCount++;
    console.log(`[harness] loop ${loopCount}/${maxLoops}, tools=${toolSet.definitions.length}`);
    yield { type: 'thinking', iteration: loopCount };

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
    let assistantText = '';
    let eventCount = 0;

    // Manual iteration with per-event timeout (replaces for-await)
    const it = stream[Symbol.asyncIterator]();
    try {
      while (true) {
        if (signal?.aborted) break;
        // Yield to event loop every 20 events so req.on('close') can fire
        if (eventCount > 0 && eventCount % 20 === 0) {
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
            console.log(`[harness] stream: tool_use_start → ${event.name} (id=${event.id})`);
            yield { type: 'tool.start', id: event.id, name: event.name };
            break;
          case 'tool_input_delta': {
            // Accumulate JSON for early key detection
            let buf = toolInputBuffers.get(event.id) || '';
            buf += event.text;
            toolInputBuffers.set(event.id, buf);
            console.log(`[harness] stream: tool_input_delta → ${event.name} +${event.text.length}chars (id=${event.id}), buf=${buf.length}chars`);

            yield { type: 'tool.input_delta', id: event.id, name: event.name, text: event.text };

            // Early detection: for execute_tool, extract "key" from partial JSON
            if (event.name === 'execute_tool' && !toolMetaResolved.has(event.id)) {
              const keyMatch = buf.match(/"key"\s*:\s*"([^"]+)"/);
              if (keyMatch) {
                toolMetaResolved.add(event.id);
                const templateKey = keyMatch[1];
                console.log(`[harness] early key detected: "${templateKey}" — looking up NodeTemplate`);
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
                    console.log(`[harness] → tool.meta: "${displayTitle}", ${argsSchema.length} fields`);
                    yield { type: 'tool.meta', id: event.id, displayTitle, argsSchema };
                  } else {
                    console.log(`[harness] → NodeTemplate not found for key="${templateKey}"`);
                  }
                } catch (e) {
                  console.error('[harness] early meta resolve error:', e.message);
                }
              }
            }
            break;
          }
          case 'tool_use_end': {
            console.log(`[harness] stream: tool_use_end → ${event.name} (id=${event.id})`);
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
            pendingToolCalls.push(tcEntry);
            break;
          }
          case 'done':
            if (event.usage) {
              totalUsage.input += event.usage.input || 0;
              totalUsage.output += event.usage.output || 0;
            }
            console.log(`[harness] stream: done (events=${eventCount}, usage=${JSON.stringify(event.usage || {})})`);
            break;
          default:
            console.log(`[harness] stream: unknown event type "${event.type}"`);
            break;
        }
      }
    } catch (streamErr) {
      // Client disconnected — clean exit
      if (streamErr?.message === 'Stream aborted') {
        console.log(`[harness] stream aborted by client after ${eventCount} events`);
        await toolSet.cleanup();
        yield { type: 'done', usage: totalUsage };
        return;
      }
      console.error(`[harness] stream error after ${eventCount} events:`, streamErr?.message || streamErr);
      // If we got text, yield what we have before throwing
      if (assistantText && pendingToolCalls.length === 0) {
        await toolSet.cleanup();
        yield { type: 'done', usage: totalUsage };
        return;
      }
      throw streamErr;
    }

    console.log(`[harness] stream complete: events=${eventCount}, text=${assistantText.length}chars, pendingTools=${pendingToolCalls.length}`);

    // Client disconnected mid-stream → stop immediately
    if (signal?.aborted) {
      console.log('[harness] aborted after stream, cleaning up');
      await toolSet.cleanup();
      yield { type: 'done', usage: totalUsage };
      return;
    }

    // No tool calls → agent is done
    if (pendingToolCalls.length === 0) {
      await toolSet.cleanup();
      yield { type: 'done', usage: totalUsage };
      return;
    }

    // Execute tools
    const toolResults = [];
    for (const tc of pendingToolCalls) {
      if (signal?.aborted) { console.log('[harness] aborted before tool:', tc.name); break; }
      const startTime = Date.now();
      console.log(`[harness] tool: ${tc.name}`, JSON.stringify(tc.input || {}).slice(0, 500));

      // ── Permission gate ────────────────────────────────────────────
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
        // If the gate itself errors, we default to allow to keep legacy behavior.
        console.error('[harness] permission check error:', permErr?.message);
      }

      if (permCheck.decision === 'deny') {
        const denyResult = { ok: false, error: 'permission_denied', reason: permCheck.reason, risk: permCheck.risk };
        toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(denyResult), status: 'error', duration: 0 });
        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result: denyResult, status: 'error', duration: 0 };
        continue;
      }

      if (permCheck.decision === 'pending') {
        if (!jobContext) {
          // Legacy mode: auto-allow but log a warning.
          console.warn(`[harness] permission pending for ${tc.name} but no jobContext — auto-allowing (legacy)`);
        } else {
          const requestId = crypto.randomUUID();
          yield {
            type: 'ai.permission.request',
            requestId,
            toolName: tc.name,
            argsPreview: _summarizeArgs(tc.input),
            risk: permCheck.risk,
          };
          jobContext.broadcast && jobContext.broadcast({
            type: 'ai.permission.request',
            requestId, toolName: tc.name, risk: permCheck.risk,
            argsPreview: _summarizeArgs(tc.input),
          });
          const resolved = await jobContext.waitForPermission(requestId, 5 * 60_000);
          if (resolved !== 'allow') {
            const denyResult = { ok: false, error: 'permission_denied', reason: 'user_denied', risk: permCheck.risk };
            toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(denyResult), status: 'error', duration: 0 });
            yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result: denyResult, status: 'error', duration: 0 };
            continue;
          }
        }
      }

      try {
        const result = await toolSet.execute(tc.name, tc.input);
        const duration = Date.now() - startTime;

        // ── Handle capsule activation ──
        if (result?._capsuleRequest) {
          const { capsule, reason } = result;
          const activation = toolSet.activateCapsule(capsule);
          console.log(`[harness] capsule ${capsule}:`, JSON.stringify(activation));

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
        console.log(`[harness] tool ${tc.name} ${toolStatus} (${duration}ms), displayTitle="${displayTitle || 'none'}":`, JSON.stringify(result || {}).slice(0, 300));
        toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(result), status: toolStatus, duration, result });
        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result, status: toolStatus, duration, displayTitle };

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
        console.error(`[harness] tool ${tc.name} ERROR (${duration}ms):`, errMsg);
        toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify({ error: errMsg }), status: 'error', duration });
        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, error: errMsg, status: 'error', duration, displayTitle: tc._displayTitle };

        // Still drain side events
        for (const ev of sideEvents) yield ev;
        sideEvents.length = 0;
      }
    }

    // Check for ask_user — pause for user response
    const askUserCall = pendingToolCalls.find(tc => tc.name === 'ask_user');
    if (askUserCall) {
      await toolSet.cleanup();
      const askResult = toolResults.find(r => r.id === askUserCall.id);
      if (askResult?.result) {
        const qEvent = { type: 'question', ...askResult.result };
        if (askResult.result.questions) qEvent.questions = askResult.result.questions;
        yield qEvent;
      }
      yield { type: 'done', usage: totalUsage };
      return;
    }

    // Add assistant message + tool results to conversation
    conversation.push({
      role: 'assistant',
      content: assistantText || null,
      tool_calls: pendingToolCalls.map(tc => ({ id: tc.id, name: tc.name, input: tc.input })),
    });
    for (const tr of toolResults) {
      // Si le tool a retourné des _contentBlocks (image/document), les propager au LLM
      // pour qu'il lise nativement via sa vision (pattern Claude Code / Codex).
      const resultObj = tr.result;
      const blocks = Array.isArray(resultObj?._contentBlocks) ? resultObj._contentBlocks : null;
      if (blocks && blocks.length) {
        const contentParts = [{ type: 'text', text: tr.content }];
        for (const b of blocks) {
          if (b.type === 'image' || b.type === 'document') contentParts.push(b);
        }
        conversation.push({ role: 'tool', tool_call_id: tr.id, content: contentParts });
      } else {
        conversation.push({ role: 'tool', tool_call_id: tr.id, content: tr.content });
      }
    }

    // Checkpoint + heartbeat (no-op without jobContext)
    if (jobContext) {
      try { await jobContext.persistCheckpoint(loopCount, conversation); } catch { /* non-fatal */ }
      try { await jobContext.heartbeat(); } catch { /* non-fatal */ }
    }
  }

  // Max loops reached
  await toolSet.cleanup();
  yield { type: 'message', text: '\n\n*Limite de boucles atteinte. Reformule ta demande si nécessaire.*' };
  yield { type: 'done', usage: totalUsage };
}

module.exports = { runHarness };
