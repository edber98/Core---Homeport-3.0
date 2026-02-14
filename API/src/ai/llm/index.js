// LLM client factory — unified interface across providers
const { streamOpenAI, formatMessages: fmtOai, formatTools: fmtOaiTools } = require('./openai');
const { streamAnthropic, formatMessages: fmtAnth, formatTools: fmtAnthTools } = require('./anthropic');

/**
 * Create a unified LLM client.
 * @param {string} provider - 'openai' | 'anthropic'
 * @param {object} config - { apiKey, model, temperature, maxTokens }
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

  if (p === 'anthropic' || p === 'claude') {
    return {
      provider: 'anthropic',
      stream(messages, tools) {
        return streamAnthropic(messages, tools, config);
      },
    };
  }

  // Default: OpenAI
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
