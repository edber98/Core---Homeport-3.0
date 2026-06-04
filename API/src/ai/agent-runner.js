// Unified agent runner — core loop with tool_use support + mode-specific tools
const { createLlmClient } = require('./llm');
const { isDebug } = require('./util/debug');
// Panel credits — débit automatique par turn. En mode DEV STANDALONE
// (KINN_PANEL_CREDITS_ENABLED != 'true'), tous les appels sont des mocks
// no-op sans dépendance Panel. Voir docs/credits-integration-kinn-app.md.
const panelCredits = require('../services/panel-credits/cjs-wrapper');
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
const { buildProjectPrompt } = require('./prompts/project');
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
    case 'project':
      prompt += buildProjectPrompt(ctx);
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

  // Inject structured project knowledge (key/value) if available
  if (Array.isArray(ctx._projectKnowledge) && ctx._projectKnowledge.length) {
    // Sort: pinned first, then by key
    const sorted = [...ctx._projectKnowledge].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return String(a.key).localeCompare(String(b.key));
    });
    const lines = sorted.map(e => {
      const v = typeof e.value === 'string' ? `"${e.value}"` : JSON.stringify(e.value);
      const desc = e.description ? ` (${e.description})` : '';
      const pin = e.pinned ? ' [épinglé]' : '';
      return `- ${e.key}: ${v}${desc}${pin}`;
    });
    prompt += '\n\n## CONNAISSANCES PROJET (référence manuelle — remplies par l\'utilisateur)\n'
      + 'Infos durables sur le projet. Utilise-les AVANT de poser des questions au user.\n'
      + lines.join('\n');
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

  // Panel credits — extract user + conversation context for billing events.
  // userId = req.user.sub propagated through context/metadata. conversationId
  // est utilisé comme idempotencyKey base + dans le ledger context.
  const _billingUserId = context?.userId || context?.user?.sub || metadata?.userId || null;
  const _billingConvId = context?.conversationId || metadata?.conversationId || null;
  let _billingIter = 0;

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
  if (agentOverrides?.llmProvider) {
    llmConfig.provider = agentOverrides.llmProvider;
    Object.assign(llmConfig, resolveProviderConfig(agentOverrides.llmProvider));
  }
  if (agentOverrides?.llmModel) llmConfig.model = agentOverrides.llmModel;
  // AI_PROVIDER env explicite → override priorité absolue
  if (process.env.AI_PROVIDER) {
    llmConfig.provider = process.env.AI_PROVIDER;
    Object.assign(llmConfig, resolveProviderConfig(process.env.AI_PROVIDER));
  }
  const llm = createLlmClient(llmConfig.provider, llmConfig);

  // 5. Build conversation
  const conversation = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  // 6. Agent loop
  let loopCount = 0;
  let totalUsage = { input: 0, output: 0 };

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
          if (isDebug()) console.log(`[agent] >> tool.start: ${event.name} (id=${event.id})`);
          yield { type: 'tool.start', id: event.id, name: event.name };
          break;

        case 'tool_input_delta':
          if (isDebug()) console.log(`[agent] >> tool.input_delta: ${event.name} +${(event.text || '').length}chars`);
          yield { type: 'tool.input_delta', id: event.id, name: event.name, text: event.text };
          break;

        case 'tool_use_end':
          if (isDebug()) console.log(`[agent] >> tool_use_end: ${event.name} input=${JSON.stringify(event.input || {}).slice(0, 200)}`);
          pendingToolCalls.push({ id: event.id, name: event.name, input: event.input });
          break;

        case 'done':
          // Accumulate token usage across loop iterations
          if (event.usage) {
            totalUsage.input += event.usage.input || 0;
            totalUsage.output += event.usage.output || 0;
            // ─── Débit Panel par turn (fire-and-forget si dev mode, awaited si prod) ──
            // En cas d'erreur insufficient_credits (402), on yield un event 'error'
            // mais on continue le stream (l'utilisateur voit le solde insuffisant).
            try {
              _billingIter++;
              const provider = String(llmConfig.providerKey || llmConfig.provider || env.AI_PROVIDER || 'anthropic').toLowerCase();
              const billing = await panelCredits.debitAnthropicTurn({
                userId: _billingUserId,
                conversationId: _billingConvId,
                iter: _billingIter,
                model: llmConfig.model || event.model || 'unknown',
                usage: { input_tokens: event.usage.input || 0, output_tokens: event.usage.output || 0, cache_read_input_tokens: event.usage.cached || 0 }
              });
              if (billing && !billing.mocked && billing.credits != null) {
                yield {
                  type: 'billing',
                  credits: billing.credits,
                  costEur: billing.costEur,
                  balance: billing.balance,
                  iter: _billingIter
                };
              }
            } catch (e) {
              if (e?.code === 'insufficient_credits' || e?.code === 'user_quota_exceeded' || e?.code === 'hard_cap_exceeded') {
                yield { type: 'error', code: e.code, balance: e.balance, message: e.message };
                return;  // stop l'agent
              }
              // autre erreur → log silencieux pour pas bloquer
              if (isDebug()) console.warn('[agent] billing error (ignored):', e?.message || e);
            }
          }
          break;
      }
    }

    // No tool calls → agent is done
    if (pendingToolCalls.length === 0) {
      // Auto-save any pending changes from mode executors
      for (const exec of modeExecutors) {
        if (exec?.cleanup) { try { await exec.cleanup(); } catch (e) { console.error('[agent] cleanup error:', e?.message); } }
      }
      yield { type: 'done', usage: totalUsage };
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
        // Extract displayTitle side-channel before serialization for LLM
        let displayTitle;
        if (result?._displayTitle) {
          displayTitle = result._displayTitle;
          delete result._displayTitle;
        }
        console.log(`[agent] tool ${tc.name} OK (${duration}ms):`, JSON.stringify(result || {}).slice(0, 300));
        toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(result), status: 'success', duration, result });

        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result, status: 'success', duration, displayTitle };

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
      yield { type: 'done', usage: totalUsage };
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
      // Check for image files in tool results — include as content blocks for Anthropic
      // (OpenAI doesn't support images in tool results, will get text fallback)
      const result = tr.result;
      if (result?._files?.some(f => f.isImage) || result?._contentBlocks?.length) {
        const contentParts = [{ type: 'text', text: tr.content }];
        // read_file tool returns _contentBlocks directly
        if (result?._contentBlocks) {
          for (const b of result._contentBlocks) {
            if (b.type === 'image') contentParts.push(b);
          }
        }
        // execute_tool results with _files containing images
        if (result?._files) {
          const { resolveAttachments } = require('./attachments');
          try {
            const imageFiles = result._files.filter(f => f.isImage);
            const blocks = await resolveAttachments(imageFiles, context.workspaceId);
            for (const b of blocks) {
              if (b.type === 'image') contentParts.push(b);
            }
          } catch (e) {
            console.error('[agent] failed to resolve image files for tool result:', e?.message);
          }
        }
        conversation.push({ role: 'tool', tool_call_id: tr.id, content: contentParts.length > 1 ? contentParts : tr.content });
      } else {
        conversation.push({ role: 'tool', tool_call_id: tr.id, content: tr.content });
      }
    }
  }

  // Max loops — auto-save before finishing
  for (const exec of modeExecutors) {
    if (exec?.cleanup) { try { await exec.cleanup(); } catch (e) { console.error('[agent] cleanup error:', e?.message); } }
  }
  yield { type: 'message', text: '\n\n*Limite de boucles atteinte. Reformule ta demande si nécessaire.*' };
  yield { type: 'done', usage: totalUsage };
}

module.exports = { runAgent, buildSystemPrompt, buildToolSet };
