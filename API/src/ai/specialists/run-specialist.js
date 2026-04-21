// Shared agent loop for all specialists — reusable core
// Each specialist configures: tool groups, prompt, LLM config
// Then delegates to this loop

const { createLlmClient } = require('../llm');
const { trackToolUsage } = require('../context/memory-manager');
const { isDebug } = require('../util/debug');

const DEFAULT_MAX_LOOPS = 40;

/**
 * Run a specialist agent loop — yields SSE events.
 *
 * @param {object} opts
 * @param {object} opts.toolSet - From resolveToolGroups() { definitions, execute, cleanup, canHandle }
 * @param {string} opts.systemPrompt - Full system prompt
 * @param {Array} opts.messages - Conversation history
 * @param {object} opts.llmConfig - LLM configuration { provider, apiKey, model, ... }
 * @param {object} [opts.agentOverrides] - Custom agent overrides (llmProvider, llmModel)
 * @param {object} [opts.context] - AI context (for tracking)
 * @param {number} [opts.maxLoops] - Max tool loops (default 40)
 * @yields {object} SSE events
 */
async function* runSpecialist(opts) {
  const { toolSet, systemPrompt, messages, context = {}, agentOverrides, maxLoops = DEFAULT_MAX_LOOPS } = opts;

  // LLM client
  const env = require('../../config/env');
  const llmConfig = { ...opts.llmConfig };
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

  let loopCount = 0;
  let totalUsage = { input: 0, output: 0 };

  console.log(`[specialist] starting: tools=${toolSet.definitions.map(t => t.name).join(',')}`);

  while (loopCount < maxLoops) {
    loopCount++;
    console.log(`[specialist] loop ${loopCount}/${maxLoops}`);
    yield { type: 'thinking', iteration: loopCount };

    const stream = llm.stream(conversation, toolSet.definitions);
    const pendingToolCalls = [];
    let assistantText = '';

    for await (const event of stream) {
      switch (event.type) {
        case 'text_delta':
          assistantText += event.text;
          yield { type: 'message', text: event.text };
          break;
        case 'tool_use_start':
          if (isDebug()) console.log(`[specialist] >> tool.start: ${event.name}`);
          yield { type: 'tool.start', id: event.id, name: event.name };
          break;
        case 'tool_input_delta':
          if (isDebug()) console.log(`[specialist] >> tool.input_delta: ${event.name}`);
          yield { type: 'tool.input_delta', id: event.id, name: event.name, text: event.text };
          break;
        case 'tool_use_end':
          if (isDebug()) console.log(`[specialist] >> tool_use_end: ${event.name}`);
          pendingToolCalls.push({ id: event.id, name: event.name, input: event.input });
          break;
        case 'done':
          if (event.usage) {
            totalUsage.input += event.usage.input || 0;
            totalUsage.output += event.usage.output || 0;
          }
          break;
      }
    }

    // No tool calls → done
    if (pendingToolCalls.length === 0) {
      await toolSet.cleanup();
      yield { type: 'done', usage: totalUsage };
      return;
    }

    // Execute tools
    const toolResults = [];
    for (const tc of pendingToolCalls) {
      const startTime = Date.now();
      console.log(`[specialist] tool call: ${tc.name}`, JSON.stringify(tc.input || {}).slice(0, 500));
      try {
        const result = await toolSet.execute(tc.name, tc.input);
        const duration = Date.now() - startTime;
        console.log(`[specialist] tool ${tc.name} OK (${duration}ms):`, JSON.stringify(result || {}).slice(0, 300));
        toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(result), status: 'success', duration, result });

        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result, status: 'success', duration };

        // Action events
        if (result?._action) {
          yield { type: 'action', action: result.action, providerKey: result.providerKey, providerName: result.providerName };
        }

        // Track tool usage
        if (tc.name === 'execute_tool' && tc.input?.key && context.userId) {
          trackToolUsage(context.userId, tc.input.key, context.companyId).catch(() => {});
        }
      } catch (e) {
        const duration = Date.now() - startTime;
        const errMsg = e?.message || String(e);
        console.error(`[specialist] tool ${tc.name} ERROR (${duration}ms):`, errMsg);
        toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify({ error: errMsg }), status: 'error', duration });
        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, error: errMsg, status: 'error', duration };

        // Still drain side events
        for (const exec of toolSet.executors || []) {
          if (exec?._sideEvents) {
            for (const ev of exec._sideEvents) yield ev;
            exec._sideEvents.length = 0;
          }
        }
      }
    }

    // Check for ask_user
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

    // Add to conversation
    conversation.push({
      role: 'assistant',
      content: assistantText || null,
      tool_calls: pendingToolCalls.map(tc => ({ id: tc.id, name: tc.name, input: tc.input })),
    });
    for (const tr of toolResults) {
      conversation.push({ role: 'tool', tool_call_id: tr.id, content: tr.content });
    }
  }

  // Max loops
  await toolSet.cleanup();
  yield { type: 'message', text: '\n\n*Limite de boucles atteinte. Reformule ta demande si nécessaire.*' };
  yield { type: 'done', usage: totalUsage };
}

module.exports = { runSpecialist, DEFAULT_MAX_LOOPS };
