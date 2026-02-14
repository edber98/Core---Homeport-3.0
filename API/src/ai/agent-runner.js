// Unified agent runner — core loop with tool_use support + mode-specific tools
const { createLlmClient } = require('./llm');
const { META_TOOL_DEFINITIONS, executeMetaTool } = require('./tools/meta-tools');
const { createWorkflowExecutor } = require('./tools/workflow-tools');
const { createNodeArgsExecutor } = require('./tools/node-args-tools');
const { createFormExecutor } = require('./tools/form-tools');
const { buildBasePrompt } = require('./prompts/base');
const { buildChatPrompt } = require('./prompts/chat');
const { buildWorkflowPrompt } = require('./prompts/workflow-builder');
const { buildNodeArgsPrompt } = require('./prompts/node-args');
const { buildFormPrompt } = require('./prompts/form-builder');
const { buildOnboardingPrompt } = require('./prompts/onboarding');
const { trackToolUsage } = require('./context/memory-manager');

const MAX_TOOL_LOOPS = 40;

function buildSystemPrompt(mode, ctx) {
  let prompt = buildBasePrompt(ctx);

  switch (mode) {
    case 'chat':
      prompt += buildChatPrompt();
      break;
    case 'workflow':
      prompt += buildWorkflowPrompt();
      break;
    case 'node_args':
      prompt += buildNodeArgsPrompt();
      break;
    case 'form':
      prompt += buildFormPrompt();
      break;
    case 'onboarding':
      prompt += buildOnboardingPrompt();
      break;
  }

  // Inject agent prompt fragment (dynamic provider or custom agent)
  if (ctx._agentPromptFragment) {
    prompt += '\n\n## Spécialisation agent\n' + ctx._agentPromptFragment;
  }

  // Inject project memory if available
  if (ctx._projectMemory && Object.keys(ctx._projectMemory).length) {
    const lines = Object.entries(ctx._projectMemory).map(([k, v]) =>
      `- ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`
    );
    prompt += '\n\n## Mémoire du projet\n' + lines.join('\n');
  }

  // Inject custom instructions
  const custom = ctx.user?.preferences?.customInstructions;
  if (custom?.trim()) {
    prompt += '\n\n## Instructions utilisateur\n' + custom.trim();
  }

  return prompt;
}

/**
 * Create mode-specific tool executors based on mode and metadata.
 * @param {string} mode
 * @param {object} metadata - { flowId, nodeId, formId, branch, workspaceId, graph }
 * @param {function} emit - Side event emitter
 * @returns {object[]} - Array of { definitions, canHandle, execute } executors
 */
function createModeExecutors(mode, metadata, emit) {
  switch (mode) {
    case 'chat':
      // Chat mode gets BOTH workflow and form tools — the AI can create workflows/forms directly
      return [
        createWorkflowExecutor(metadata, emit),
        createFormExecutor(metadata, emit),
      ];
    case 'workflow':
      return [createWorkflowExecutor(metadata, emit)];
    case 'node_args':
      return [createNodeArgsExecutor(metadata, emit)];
    case 'form':
      return [createFormExecutor(metadata, emit)];
    default:
      return [];
  }
}

function buildToolSet(mode, modeExecutors) {
  // Base meta-tools always available
  let tools = [...META_TOOL_DEFINITIONS];

  // Add mode-specific tools from all executors
  for (const exec of modeExecutors) {
    if (exec?.definitions) {
      tools = [...tools, ...exec.definitions];
    }
  }

  // Deduplicate by name (in case same tool appears in multiple executors)
  const seen = new Set();
  tools = tools.filter(t => {
    if (seen.has(t.name)) return false;
    seen.add(t.name);
    return true;
  });

  return tools;
}

/**
 * Run the AI agent — yields SSE events as an async generator.
 *
 * @param {object} opts
 * @param {string} opts.mode - 'chat' | 'workflow' | 'node_args' | 'form' | 'onboarding'
 * @param {Array} opts.messages - Conversation history [{role, content}]
 * @param {object} opts.context - Built context from context-builder
 * @param {object} [opts.metadata] - Mode-specific: { flowId, nodeId, formId, branch, graph }
 * @param {object} [opts.agentOverrides] - Custom agent overrides
 * @yields {object} SSE events: message, tool.start, tool.end, question, patch, snapshot, args, desc, done
 */
async function* runAgent({ mode, messages, context, metadata, agentOverrides }) {
  // Side events queue (mode tools emit patches, args, etc.)
  const sideEvents = [];
  const emit = (ev) => sideEvents.push(ev);

  // 1. Create mode-specific executors
  const modeMetadata = {
    ...(metadata || {}),
    workspaceId: context.workspaceId || metadata?.workspaceId,
  };
  const modeExecutors = createModeExecutors(mode, modeMetadata, emit);

  // Attach metadata to context so meta-tools can access it (project memory, etc.)
  context._metadata = modeMetadata;

  // 2. Build system prompt
  let systemPrompt = buildSystemPrompt(mode, context);
  if (agentOverrides?.systemPrompt) {
    systemPrompt += '\n\n## Instructions personnalisées\n' + agentOverrides.systemPrompt;
  }

  // 3. Select tools
  const tools = buildToolSet(mode, modeExecutors);

  // 4. Create LLM client (allow agent override)
  const env = require('../config/env');
  const llmConfig = { ...context.llmConfig };
  if (agentOverrides?.llmProvider) {
    llmConfig.provider = agentOverrides.llmProvider;
    // Resolve correct API key for overridden provider
    const p = agentOverrides.llmProvider.toLowerCase();
    if (p === 'anthropic' || p === 'claude') {
      llmConfig.apiKey = env.ANTHROPIC_API_KEY;
    } else {
      llmConfig.apiKey = env.OPENAI_API_KEY;
    }
  }
  if (agentOverrides?.llmModel) llmConfig.model = agentOverrides.llmModel;
  const llm = createLlmClient(llmConfig.provider, llmConfig);

  // 5. Build conversation
  const conversation = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  // 6. Agent loop
  let loopCount = 0;

  console.log(`[agent] starting run: mode=${mode}, tools=${tools.map(t => t.name).join(',')}`);

  while (loopCount < MAX_TOOL_LOOPS) {
    loopCount++;
    console.log(`[agent] loop iteration ${loopCount}/${MAX_TOOL_LOOPS}`);
    yield { type: 'thinking', iteration: loopCount };
    const stream = llm.stream(conversation, tools);
    const pendingToolCalls = [];
    let assistantText = '';

    for await (const event of stream) {
      switch (event.type) {
        case 'text_delta':
          assistantText += event.text;
          yield { type: 'message', text: event.text };
          break;

        case 'tool_use_start':
          if (process.env.AI_DEBUG) console.log(`[agent] >> tool.start: ${event.name} (id=${event.id})`);
          yield { type: 'tool.start', id: event.id, name: event.name };
          break;

        case 'tool_input_delta':
          if (process.env.AI_DEBUG) console.log(`[agent] >> tool.input_delta: ${event.name} +${(event.text || '').length}chars`);
          yield { type: 'tool.input_delta', id: event.id, name: event.name, text: event.text };
          break;

        case 'tool_use_end':
          if (process.env.AI_DEBUG) console.log(`[agent] >> tool_use_end: ${event.name} input=${JSON.stringify(event.input || {}).slice(0, 200)}`);
          pendingToolCalls.push({ id: event.id, name: event.name, input: event.input });
          break;

        case 'done':
          break;
      }
    }

    // No tool calls → agent is done
    if (pendingToolCalls.length === 0) {
      // Auto-save any pending changes from mode executors
      for (const exec of modeExecutors) {
        if (exec?.cleanup) { try { await exec.cleanup(); } catch (e) { console.error('[agent] cleanup error:', e?.message); } }
      }
      yield { type: 'done', usage: null };
      return;
    }

    // Execute tools
    const toolResults = [];
    for (const tc of pendingToolCalls) {
      const startTime = Date.now();
      console.log(`[agent] tool call: ${tc.name}`, JSON.stringify(tc.input || {}).slice(0, 500));
      try {
        // Try mode-specific executors first, then meta-tools
        let result;
        const executor = modeExecutors.find(ex => ex?.canHandle(tc.name));
        if (executor) {
          result = await executor.execute(tc.name, tc.input);
        } else {
          result = await executeMetaTool(tc.name, tc.input, context);
        }

        const duration = Date.now() - startTime;
        console.log(`[agent] tool ${tc.name} OK (${duration}ms):`, JSON.stringify(result || {}).slice(0, 300));
        toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(result), status: 'success', duration, result });

        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result, status: 'success', duration };

        // Emit action events (e.g. open_credentials) for frontend handling
        if (result?._action) {
          yield { type: 'action', action: result.action, providerKey: result.providerKey, providerName: result.providerName };
        }

        // Yield side events from mode tools (patches, args, etc.)
        for (const ev of sideEvents) yield ev;
        sideEvents.length = 0;

        // Track tool usage
        if (tc.name === 'execute_tool' && tc.input?.key) {
          trackToolUsage(context.userId, tc.input.key, context.companyId).catch(() => {});
        }
      } catch (e) {
        const duration = Date.now() - startTime;
        const errMsg = e?.message || String(e);
        console.error(`[agent] tool ${tc.name} ERROR (${duration}ms):`, errMsg);
        toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify({ error: errMsg }), status: 'error', duration });

        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, error: errMsg, status: 'error', duration };

        // Still yield side events
        for (const ev of sideEvents) yield ev;
        sideEvents.length = 0;
      }
    }

    // Check for ask_user — pause and wait for user response
    const askUserCall = pendingToolCalls.find(tc => tc.name === 'ask_user');
    if (askUserCall) {
      // Auto-save before pausing for user response
      for (const exec of modeExecutors) {
        if (exec?.cleanup) { try { await exec.cleanup(); } catch (e) { console.error('[agent] cleanup error:', e?.message); } }
      }
      const askResult = toolResults.find(r => r.id === askUserCall.id);
      if (askResult?.result) {
        const qEvent = { type: 'question', ...askResult.result };
        // Propagate batch questions if present
        if (askResult.result.questions) qEvent.questions = askResult.result.questions;
        yield qEvent;
      }
      yield { type: 'done', usage: null };
      return;
    }

    // Add assistant message + tool results to conversation
    const assistantMsg = {
      role: 'assistant',
      content: assistantText || null,
      tool_calls: pendingToolCalls.map(tc => ({ id: tc.id, name: tc.name, input: tc.input })),
    };
    conversation.push(assistantMsg);

    for (const tr of toolResults) {
      conversation.push({ role: 'tool', tool_call_id: tr.id, content: tr.content });
    }
  }

  // Max loops — auto-save before finishing
  for (const exec of modeExecutors) {
    if (exec?.cleanup) { try { await exec.cleanup(); } catch (e) { console.error('[agent] cleanup error:', e?.message); } }
  }
  yield { type: 'message', text: '\n\n*Limite de boucles atteinte. Reformule ta demande si nécessaire.*' };
  yield { type: 'done', usage: null };
}

module.exports = { runAgent, buildSystemPrompt, buildToolSet };
