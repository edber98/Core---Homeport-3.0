// Router agent — lightweight intention detector for chat mode
// 6 tools only: delegate_workflow, delegate_form, delegate_execution, ask_user, save_memory, get_memory

const { createLlmClient } = require('./llm');
const { buildBasePrompt } = require('./prompts/base');
const { buildRouterPrompt } = require('./prompts/router');
const { executeMetaTool } = require('./tools/meta-tools');

// Router-specific delegation tools
const ROUTER_TOOL_DEFINITIONS = [
  {
    name: 'delegate_workflow',
    description: 'Délègue au spécialiste workflow pour créer ou modifier un workflow/automatisation.',
    parameters: {
      type: 'object',
      properties: {
        userMessage: { type: 'string', description: 'Le message original de l\'utilisateur à transmettre au spécialiste' },
        reason: { type: 'string', description: 'Raison de la délégation (pour le log)' },
      },
      required: ['userMessage'],
    },
  },
  {
    name: 'delegate_form',
    description: 'Délègue au spécialiste formulaire pour créer ou modifier un formulaire.',
    parameters: {
      type: 'object',
      properties: {
        userMessage: { type: 'string', description: 'Le message original de l\'utilisateur à transmettre au spécialiste' },
        reason: { type: 'string', description: 'Raison de la délégation' },
      },
      required: ['userMessage'],
    },
  },
  {
    name: 'delegate_execution',
    description: 'Délègue au spécialiste exécution pour interagir avec un provider (Odoo, Slack, Google, etc.) — lister, créer, modifier, supprimer des données.',
    parameters: {
      type: 'object',
      properties: {
        userMessage: { type: 'string', description: 'Le message original de l\'utilisateur à transmettre au spécialiste' },
        reason: { type: 'string', description: 'Raison de la délégation' },
      },
      required: ['userMessage'],
    },
  },
];

// Meta tools available to the router (subset of core)
const ROUTER_META_NAMES = ['ask_user', 'save_memory', 'get_memory'];

/**
 * Run the router — either responds directly or yields a delegation event.
 *
 * @yields SSE events + potentially a special { type: 'delegation', specialist, userMessage } event
 */
async function* runRouter({ messages, context, agentOverrides }) {
  const env = require('../config/env');
  const llmConfig = { ...context.llmConfig };
  if (agentOverrides?.llmProvider) {
    llmConfig.provider = agentOverrides.llmProvider;
    const p = agentOverrides.llmProvider.toLowerCase();
    llmConfig.apiKey = (p === 'anthropic' || p === 'claude') ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;
  }
  if (agentOverrides?.llmModel) llmConfig.model = agentOverrides.llmModel;
  const llm = createLlmClient(llmConfig.provider, llmConfig);

  // Build minimal system prompt (base context + router instructions only)
  let systemPrompt = buildBasePrompt(context) + buildRouterPrompt();
  if (context._agentPromptFragment) {
    systemPrompt += '\n\n## Spécialisation agent\n' + context._agentPromptFragment;
  }

  // Import meta-tool definitions for the router subset
  const { META_TOOL_DEFINITIONS } = require('./tools/meta-tools');
  const metaDefs = META_TOOL_DEFINITIONS.filter(t => ROUTER_META_NAMES.includes(t.name));
  const tools = [...ROUTER_TOOL_DEFINITIONS, ...metaDefs];

  const conversation = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  let totalUsage = { input: 0, output: 0 };

  console.log(`[router] starting with ${tools.length} tools`);
  yield { type: 'thinking', iteration: 1 };

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
        yield { type: 'tool.start', id: event.id, name: event.name };
        break;
      case 'tool_input_delta':
        yield { type: 'tool.input_delta', id: event.id, name: event.name, text: event.text };
        break;
      case 'tool_use_end':
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

  // No tool calls → direct response
  if (pendingToolCalls.length === 0) {
    yield { type: 'done', usage: totalUsage };
    return;
  }

  // Check for delegation
  for (const tc of pendingToolCalls) {
    if (tc.name.startsWith('delegate_')) {
      const specialist = tc.name.replace('delegate_', '');
      console.log(`[router] delegating to ${specialist}: ${tc.input?.reason || ''}`);
      // Yield tool end for UI feedback
      yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result: { delegated: specialist }, status: 'success', duration: 0 };
      // Yield delegation event for the harness to intercept
      yield { type: 'delegation', specialist, userMessage: tc.input?.userMessage || '', reason: tc.input?.reason || '', usage: totalUsage };
      return;
    }
  }

  // Handle meta-tools (ask_user, memory)
  for (const tc of pendingToolCalls) {
    if (ROUTER_META_NAMES.includes(tc.name)) {
      try {
        const result = await executeMetaTool(tc.name, tc.input, context);
        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result, status: 'success', duration: 0 };

        if (tc.name === 'ask_user' && result) {
          const qEvent = { type: 'question', ...result };
          if (result.questions) qEvent.questions = result.questions;
          yield qEvent;
        }
      } catch (e) {
        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, error: e?.message, status: 'error', duration: 0 };
      }
    }
  }

  yield { type: 'done', usage: totalUsage };
}

module.exports = { runRouter, ROUTER_TOOL_DEFINITIONS };
