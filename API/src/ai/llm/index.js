// LLM client factory — unified interface across providers via LlmAdapter.
//
// L'adapter normalise les events provider-specific :
//   - usage : { input, output, reasoning, cached_creation, cached_read }
//   - stop_reason : 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | 'content_filter' | 'error'
//   - truncated : bool (true si max_tokens atteint sans completion)
//
// Le harness lit `done.usage.input/output/reasoning/cached_read` et `done.truncated`
// — peu importe le provider.
//
// Backward compat : l'objet retourné expose toujours .stream(messages, tools) → AsyncGenerator.
// Mais c'est désormais un LlmAdapter avec en plus : .supportsTemperature(), .supportsReasoning(),
// .getDefaultMaxTokens(), .provider, .model.

const { createAdapter } = require('./adapter');

/**
 * Create a unified LLM client.
 * @param {string} provider - 'openai' | 'anthropic'
 * @param {object} config - { apiKey, model, temperature, maxTokens, useResponsesApi, reasoningEffort, verbosity }
 * @returns {LlmAdapter}
 */
function createLlmClient(provider, config = {}) {
  return createAdapter(provider, config);
}

module.exports = { createLlmClient };
