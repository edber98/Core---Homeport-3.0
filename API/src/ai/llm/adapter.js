// LLM Adapter — couche d'unification des 3 clients (Anthropic / OpenAI Chat / OpenAI Responses).
//
// Objectif : garantir que le harness ne voit qu'une interface unique et que les divergences
// provider (usage, stop_reason, multimodal, max_tokens, temperature) sont gérées à un seul endroit.
//
// Events normalisés émis par stream(messages, tools) :
//
//   text_delta       { type, text }
//   tool_use_start   { type, index, id, name }
//   tool_input_delta { type, index, id, name, text }
//   tool_use_end     { type, index, id, name, input }
//   stop             { type, reason: 'end_turn'|'tool_use'|'max_tokens'|'stop_sequence'|'content_filter'|'error' }
//   done             { type, usage: NormalizedUsage, stopReason?: string, truncated?: boolean }
//
// NormalizedUsage : { input, output, reasoning, cached_creation, cached_read }
//   - Tous les champs présents même si 0 (parité provider).
//   - cached_* spécifique Anthropic ; reasoning spécifique OpenAI Responses ; 0 ailleurs.

const { streamAnthropic } = require('./anthropic');
const { streamOpenAI, formatMessages: fmtOai, formatTools: fmtOaiTools } = require('./openai');
const { streamOpenAIResponses } = require('./openai-responses');

const KIND_ANTHROPIC = 'anthropic';
const KIND_OPENAI_CHAT = 'openai';
const KIND_OPENAI_RESPONSES = 'openai-responses';

/** Mapping bruite → normalized stop reason. Le harness s'en sert pour détecter une troncature. */
function normalizeStopReason(provider, raw) {
  if (!raw) return null;
  const v = String(raw).toLowerCase();
  // Anthropic
  if (provider === KIND_ANTHROPIC) {
    if (v === 'end_turn') return 'end_turn';
    if (v === 'tool_use') return 'tool_use';
    if (v === 'max_tokens') return 'max_tokens';
    if (v === 'stop_sequence') return 'stop_sequence';
    return v;
  }
  // OpenAI Chat
  if (provider === KIND_OPENAI_CHAT) {
    if (v === 'stop') return 'end_turn';
    if (v === 'tool_calls') return 'tool_use';
    if (v === 'length') return 'max_tokens';
    if (v === 'content_filter') return 'content_filter';
    return v;
  }
  // OpenAI Responses
  if (provider === KIND_OPENAI_RESPONSES) {
    if (v === 'completed') return 'end_turn';
    if (v === 'incomplete') return 'max_tokens';
    if (v === 'failed') return 'error';
    if (v === 'cancelled') return 'error';
    return v;
  }
  return v;
}

function emptyUsage() {
  return { input: 0, output: 0, reasoning: 0, cached_creation: 0, cached_read: 0 };
}

/**
 * Normalise un objet usage brut (issu du provider) en NormalizedUsage.
 * Reste tolérant aux champs manquants : tout absent → 0.
 */
function normalizeUsage(provider, raw) {
  const out = emptyUsage();
  if (!raw || typeof raw !== 'object') return out;

  if (provider === KIND_ANTHROPIC) {
    out.input = Number(raw.input_tokens || raw.input || 0);
    out.output = Number(raw.output_tokens || raw.output || 0);
    out.cached_creation = Number(raw.cache_creation_input_tokens || 0);
    out.cached_read = Number(raw.cache_read_input_tokens || 0);
    return out;
  }
  if (provider === KIND_OPENAI_CHAT) {
    out.input = Number(raw.prompt_tokens || raw.input || 0);
    out.output = Number(raw.completion_tokens || raw.output || 0);
    // OpenAI expose parfois prompt_tokens_details.cached_tokens
    out.cached_read = Number(raw.prompt_tokens_details?.cached_tokens || 0);
    return out;
  }
  if (provider === KIND_OPENAI_RESPONSES) {
    out.input = Number(raw.input_tokens || raw.input || 0);
    out.output = Number(raw.output_tokens || raw.output || 0);
    out.reasoning = Number(raw.output_tokens_details?.reasoning_tokens || raw.reasoning || 0);
    out.cached_read = Number(raw.input_tokens_details?.cached_tokens || 0);
    return out;
  }
  // fallback
  out.input = Number(raw.input || 0);
  out.output = Number(raw.output || 0);
  return out;
}

/**
 * Base class. Les sous-classes implémentent _rawStream() qui retourne le générateur brut du provider.
 * stream() s'occupe de la normalisation (usage, stop_reason, truncation detection).
 */
class LlmAdapter {
  constructor(provider, config) {
    this.provider = provider;
    this.config = config || {};
    this.model = this.config.model || '';
  }

  /** Override par chaque sous-classe. */
  // eslint-disable-next-line require-yield
  async *_rawStream(/* messages, tools */) {
    throw new Error('LlmAdapter._rawStream is abstract');
  }

  /** Override par sous-classe si le provider/modèle a un comportement particulier. */
  supportsTemperature() { return true; }
  supportsReasoning() { return false; }
  getDefaultMaxTokens() { return 4096; }

  /**
   * stream() = pipeline normalisé que voit le harness.
   * Garantit qu'AVANT un `done`, on émet toujours un `stop` avec un reason normalisé.
   * Le `done` final contient une `usage` complète (tous champs présents) et un `stopReason`.
   */
  async *stream(messages, tools) {
    let lastUsageRaw = null;
    let lastStopRaw = null;
    let emittedDone = false;

    try {
      for await (const ev of this._rawStream(messages, tools)) {
        // Intercepter le `done` pour ajouter normalization. Les sous-classes
        // peuvent enrichir ev.usage et ev.stopReasonRaw avant ce point.
        if (ev?.type === 'done') {
          if (ev.usage) lastUsageRaw = ev.usage;
          if (ev.stopReasonRaw) lastStopRaw = ev.stopReasonRaw;
          const normalizedStop = normalizeStopReason(this.provider, lastStopRaw);
          if (normalizedStop) yield { type: 'stop', reason: normalizedStop };
          const usage = normalizeUsage(this.provider, lastUsageRaw);
          const truncated = normalizedStop === 'max_tokens';
          yield { type: 'done', usage, stopReason: normalizedStop, truncated };
          emittedDone = true;
          continue;
        }
        // Catch usage updates emitted as separate events (some providers stream usage avant done)
        if (ev?.type === 'usage' && ev.usage) {
          lastUsageRaw = ev.usage;
          continue; // on ne propage pas usage standalone, le harness lit done.usage
        }
        // Catch stop signals émis avant done
        if (ev?.type === 'stop_reason' && ev.reason) {
          lastStopRaw = ev.reason;
          continue;
        }
        yield ev;
      }
    } finally {
      // Garantie : on émet toujours un done, même si le provider a coupé brutalement.
      if (!emittedDone) {
        const normalizedStop = normalizeStopReason(this.provider, lastStopRaw) || 'error';
        yield { type: 'stop', reason: normalizedStop };
        yield {
          type: 'done',
          usage: normalizeUsage(this.provider, lastUsageRaw),
          stopReason: normalizedStop,
          truncated: normalizedStop === 'max_tokens',
        };
      }
    }
  }
}

class AnthropicAdapter extends LlmAdapter {
  constructor(config) { super(KIND_ANTHROPIC, config); }

  supportsTemperature() {
    const m = this.model || '';
    return !m.includes('opus-4-7') && !m.includes('opus-4-6');
  }

  getDefaultMaxTokens() {
    return (this.model || '').includes('opus') ? 16384 : 4096;
  }

  async *_rawStream(messages, tools) {
    // streamAnthropic gère lui-même formatMessages + formatTools en interne.
    yield* streamAnthropic(messages, tools, this.config);
  }
}

class OpenAiChatAdapter extends LlmAdapter {
  constructor(config) { super(KIND_OPENAI_CHAT, config); }

  supportsTemperature() {
    const m = this.model || '';
    const isReasoning = /^(gpt-5|o[1-9])/.test(m);
    return !isReasoning || this.config.reasoningEffort === 'none';
  }

  getDefaultMaxTokens() { return Number(this.config.maxTokens) || 16384; }

  async *_rawStream(messages, tools) {
    const fmtMsgs = fmtOai(messages);
    const fmtTls = fmtOaiTools(tools);
    yield* streamOpenAI(fmtMsgs, fmtTls, this.config);
  }
}

class OpenAiResponsesAdapter extends LlmAdapter {
  constructor(config) { super(KIND_OPENAI_RESPONSES, config); }

  supportsTemperature() { return this.config.reasoningEffort === 'none'; }
  supportsReasoning() { return true; }
  getDefaultMaxTokens() { return Number(this.config.maxTokens) || 16384; }

  async *_rawStream(messages, tools) {
    // openai-responses.js gère lui-même le format input
    yield* streamOpenAIResponses(messages, tools, this.config);
  }
}

/**
 * Factory — retourne l'adapter approprié selon le provider et le modèle.
 * @param {string} provider - 'anthropic' | 'openai'
 * @param {object} config - { apiKey, model, temperature, maxTokens, reasoningEffort, verbosity, useResponsesApi }
 */
function createAdapter(provider, config = {}) {
  const p = String(provider || 'openai').toLowerCase();

  if (p === 'anthropic' || p === 'claude') {
    return new AnthropicAdapter(config);
  }

  // Aliases pour serveurs OpenAI-compatibles auto-hébergés :
  //   vllm, ollama, lmstudio, openai-compatible, together, groq, mistral-api
  // Tous utilisent l'API Chat Completions standard avec baseURL custom.
  // L'user passe baseURL dans config (ex: 'http://192.168.1.10:8000/v1').
  const OPENAI_COMPAT_ALIASES = new Set([
    'vllm', 'ollama', 'lmstudio', 'lm-studio',
    'openai-compatible', 'openai-compat',
    'together', 'groq', 'mistral-api', 'fireworks',
  ]);
  if (OPENAI_COMPAT_ALIASES.has(p)) {
    // Force Chat Completions (jamais Responses API pour les serveurs non-officiels)
    // + apiKey défaut 'local' si non fourni (vLLM accepte n'importe quoi).
    return new OpenAiChatAdapter({
      ...config,
      apiKey: config.apiKey || 'local',
    });
  }

  const env = require('../../config/env');
  const forceChat = env.AI_FORCE_CHAT_COMPLETIONS;
  const useResponses = !forceChat && (config.useResponsesApi || /^(gpt-5|o[1-9])/.test(config.model || ''));

  if (useResponses) {
    return new OpenAiResponsesAdapter(config);
  }
  return new OpenAiChatAdapter(config);
}

module.exports = {
  LlmAdapter,
  AnthropicAdapter,
  OpenAiChatAdapter,
  OpenAiResponsesAdapter,
  createAdapter,
  normalizeUsage,
  normalizeStopReason,
  emptyUsage,
  KIND_ANTHROPIC,
  KIND_OPENAI_CHAT,
  KIND_OPENAI_RESPONSES,
};
