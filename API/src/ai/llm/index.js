// LLM client factory — unified interface across providers
const { streamOpenAI, formatMessages: fmtOai, formatTools: fmtOaiTools } = require('./openai');
const { streamAnthropic, formatMessages: fmtAnth, formatTools: fmtAnthTools } = require('./anthropic');
const { streamOpenAIResponses } = require('./openai-responses');

/**
 * Create a unified LLM client.
 * @param {string} provider - 'openai' | 'anthropic'
 * @param {object} config - { apiKey, model, temperature, maxTokens, useResponsesApi, reasoningEffort }
 * @returns {{ stream(messages, tools) → AsyncGenerator<Event> }}
 *
 * Normalized event types:
 *   text_delta     { type, text }
 *   tool_use_start { type, index, id, name }
 *   tool_input_delta { type, index, id, name, text }
 *   tool_use_end   { type, index, id, name, input }
 *   done           { type, usage: { input, output } }
 */
function createLlmClient(provider, config = {}) {
  const p = String(provider || 'openai').toLowerCase();
  const env = require('../../config/env');

  if (p === 'anthropic' || p === 'claude') {
    return {
      provider: 'anthropic',
      stream(messages, tools) {
        return streamAnthropic(messages, tools, config);
      },
    };
  }

  // OpenAI: choose between Responses API and ChatCompletions
  // Responses API for GPT-5.x, o-series, or when explicitly requested
  // AI_FORCE_CHAT_COMPLETIONS=1 overrides to always use ChatCompletions
  const forceChatCompletions = env.AI_FORCE_CHAT_COMPLETIONS;
  const useResponses = !forceChatCompletions && (config.useResponsesApi || /^(gpt-5|o[1-9])/.test(config.model || ''));

  if (useResponses) {
    return {
      provider: 'openai-responses',
      stream(messages, tools) {
        return streamOpenAIResponses(messages, tools, config);
      },
    };
  }

  // Default: OpenAI ChatCompletions
  return {
    provider: 'openai',
    stream(messages, tools) {
      const fmtMsgs = fmtOai(messages);
      const fmtTls = fmtOaiTools(tools);
      return streamOpenAI(fmtMsgs, fmtTls, config);
    },
  };
}

module.exports = { createLlmClient };
