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

// Fallback for onboarding mode
const { runAgent } = require('./agent-runner');

const DEFAULT_MAX_LOOPS = 40;
const STREAM_TIMEOUT_MS = 120_000; // 120s per-event timeout

/**
 * Read next value from async iterator with timeout.
 * Throws if no event arrives within timeoutMs.
 */
function nextWithTimeout(iterator, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`LLM stream timeout: no event for ${timeoutMs / 1000}s`)),
      timeoutMs,
    );
    iterator.next().then(
      r => { clearTimeout(timer); resolve(r); },
      e => { clearTimeout(timer); reject(e); },
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
async function* runHarness({ mode, messages, context, metadata, agentOverrides }) {
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
    let assistantText = '';
    let eventCount = 0;

    // Manual iteration with per-event timeout (replaces for-await)
    const it = stream[Symbol.asyncIterator]();
    try {
      while (true) {
        const { done, value: event } = await nextWithTimeout(it, STREAM_TIMEOUT_MS);
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
          case 'tool_input_delta':
            yield { type: 'tool.input_delta', id: event.id, name: event.name, text: event.text };
            break;
          case 'tool_use_end':
            console.log(`[harness] stream: tool_use_end → ${event.name} (id=${event.id})`);
            pendingToolCalls.push({ id: event.id, name: event.name, input: event.input });
            break;
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

    // No tool calls → agent is done
    if (pendingToolCalls.length === 0) {
      await toolSet.cleanup();
      yield { type: 'done', usage: totalUsage };
      return;
    }

    // Execute tools
    const toolResults = [];
    for (const tc of pendingToolCalls) {
      const startTime = Date.now();
      console.log(`[harness] tool: ${tc.name}`, JSON.stringify(tc.input || {}).slice(0, 500));

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

          toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(response), status: 'success', duration });
          yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result: response, status: 'success', duration };
          continue;
        }

        // ── Normal tool result ──
        console.log(`[harness] tool ${tc.name} OK (${duration}ms):`, JSON.stringify(result || {}).slice(0, 300));
        toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(result), status: 'success', duration, result });
        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result, status: 'success', duration };

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
        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, error: errMsg, status: 'error', duration };

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
      conversation.push({ role: 'tool', tool_call_id: tr.id, content: tr.content });
    }
  }

  // Max loops reached
  await toolSet.cleanup();
  yield { type: 'message', text: '\n\n*Limite de boucles atteinte. Reformule ta demande si nécessaire.*' };
  yield { type: 'done', usage: totalUsage };
}

module.exports = { runHarness };
