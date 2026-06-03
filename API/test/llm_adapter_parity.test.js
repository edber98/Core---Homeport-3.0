// Tests de parité provider sur le LlmAdapter.
//
// Objectif : garantir que les 3 implémentations (Anthropic / OpenAI Chat / OpenAI Responses)
// émettent les mêmes events normalisés (usage, stop_reason, truncated) avec les mêmes contrats.
//
// Pas d'appel réseau : on monkey-patch le _rawStream de chaque adapter pour injecter des
// événements bruts simulant les réponses des 3 providers.

const { test } = require('node:test');
const assert = require('node:assert');

const {
  createAdapter,
  AnthropicAdapter,
  OpenAiChatAdapter,
  OpenAiResponsesAdapter,
  LlmAdapter,
  normalizeUsage,
  normalizeStopReason,
  emptyUsage,
} = require('../src/ai/llm/adapter');

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/** Construit un adapter, override son _rawStream pour rejouer une séquence d'events. */
function mockAdapter(Adapter, config, rawEvents) {
  const a = new Adapter(config);
  a._rawStream = async function* () {
    for (const ev of rawEvents) yield ev;
  };
  return a;
}

/** Collecte tous les events yieldés par adapter.stream(). */
async function collect(adapter) {
  const out = [];
  for await (const ev of adapter.stream([], [])) out.push(ev);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Tests basiques de la couche normalization
// ─────────────────────────────────────────────────────────────────────────

test('emptyUsage : tous champs à 0', () => {
  const u = emptyUsage();
  assert.deepStrictEqual(u, { input: 0, output: 0, reasoning: 0, cached_creation: 0, cached_read: 0 });
});

test('normalizeUsage anthropic : préserve cache tokens', () => {
  const u = normalizeUsage('anthropic', {
    input_tokens: 1000, output_tokens: 200,
    cache_creation_input_tokens: 500, cache_read_input_tokens: 800,
  });
  assert.strictEqual(u.input, 1000);
  assert.strictEqual(u.output, 200);
  assert.strictEqual(u.cached_creation, 500);
  assert.strictEqual(u.cached_read, 800);
  assert.strictEqual(u.reasoning, 0); // Anthropic n'a pas de reasoning
});

test('normalizeUsage openai chat : préserve cached_tokens', () => {
  const u = normalizeUsage('openai', {
    prompt_tokens: 100, completion_tokens: 50,
    prompt_tokens_details: { cached_tokens: 60 },
  });
  assert.strictEqual(u.input, 100);
  assert.strictEqual(u.output, 50);
  assert.strictEqual(u.cached_read, 60);
  assert.strictEqual(u.reasoning, 0);
});

test('normalizeUsage openai-responses : préserve reasoning tokens', () => {
  const u = normalizeUsage('openai-responses', {
    input_tokens: 100, output_tokens: 50,
    output_tokens_details: { reasoning_tokens: 300 },
    input_tokens_details: { cached_tokens: 25 },
  });
  assert.strictEqual(u.input, 100);
  assert.strictEqual(u.output, 50);
  assert.strictEqual(u.reasoning, 300);
  assert.strictEqual(u.cached_read, 25);
});

test('normalizeUsage tolère payload null/incomplet', () => {
  const u = normalizeUsage('anthropic', null);
  assert.deepStrictEqual(u, emptyUsage());
});

test('normalizeStopReason : end_turn équivalent sur 3 providers', () => {
  assert.strictEqual(normalizeStopReason('anthropic', 'end_turn'), 'end_turn');
  assert.strictEqual(normalizeStopReason('openai', 'stop'), 'end_turn');
  assert.strictEqual(normalizeStopReason('openai-responses', 'completed'), 'end_turn');
});

test('normalizeStopReason : max_tokens équivalent sur 3 providers', () => {
  assert.strictEqual(normalizeStopReason('anthropic', 'max_tokens'), 'max_tokens');
  assert.strictEqual(normalizeStopReason('openai', 'length'), 'max_tokens');
  assert.strictEqual(normalizeStopReason('openai-responses', 'incomplete'), 'max_tokens');
});

test('normalizeStopReason : tool_use équivalent (Anthropic + OpenAI chat)', () => {
  assert.strictEqual(normalizeStopReason('anthropic', 'tool_use'), 'tool_use');
  assert.strictEqual(normalizeStopReason('openai', 'tool_calls'), 'tool_use');
});

// ─────────────────────────────────────────────────────────────────────────
// Tests : factory crée le bon adapter selon provider/model
// ─────────────────────────────────────────────────────────────────────────

test('createAdapter : provider=anthropic → AnthropicAdapter', () => {
  const a = createAdapter('anthropic', { apiKey: 'x', model: 'claude-sonnet-4-5' });
  assert.ok(a instanceof AnthropicAdapter);
  assert.strictEqual(a.provider, 'anthropic');
});

test('createAdapter : provider=claude (alias) → AnthropicAdapter', () => {
  const a = createAdapter('claude', { apiKey: 'x', model: 'claude-opus-4-7' });
  assert.ok(a instanceof AnthropicAdapter);
});

test('createAdapter : openai + gpt-4o → OpenAiChatAdapter', () => {
  const a = createAdapter('openai', { apiKey: 'x', model: 'gpt-4o' });
  assert.ok(a instanceof OpenAiChatAdapter);
  assert.strictEqual(a.provider, 'openai');
});

test('createAdapter : openai + gpt-5.2 → OpenAiResponsesAdapter (auto-detect)', () => {
  const a = createAdapter('openai', { apiKey: 'x', model: 'gpt-5.2' });
  assert.ok(a instanceof OpenAiResponsesAdapter);
  assert.strictEqual(a.provider, 'openai-responses');
});

test('createAdapter : openai + o3 → OpenAiResponsesAdapter (auto-detect o-series)', () => {
  const a = createAdapter('openai', { apiKey: 'x', model: 'o3' });
  assert.ok(a instanceof OpenAiResponsesAdapter);
});

// ─────────────────────────────────────────────────────────────────────────
// Tests : capacités (supportsTemperature, supportsReasoning, max tokens)
// ─────────────────────────────────────────────────────────────────────────

test('Anthropic opus-4-7 : temperature désactivée', () => {
  const a = createAdapter('anthropic', { apiKey: 'x', model: 'claude-opus-4-7' });
  assert.strictEqual(a.supportsTemperature(), false);
});

test('Anthropic claude-sonnet : temperature activée', () => {
  const a = createAdapter('anthropic', { apiKey: 'x', model: 'claude-sonnet-4-5' });
  assert.strictEqual(a.supportsTemperature(), true);
});

test('Anthropic opus : max tokens 16384', () => {
  const a = createAdapter('anthropic', { apiKey: 'x', model: 'claude-opus-4-7' });
  assert.strictEqual(a.getDefaultMaxTokens(), 16384);
});

test('OpenAI Responses : supports reasoning', () => {
  const a = createAdapter('openai', { apiKey: 'x', model: 'gpt-5.2', reasoningEffort: 'medium' });
  assert.strictEqual(a.supportsReasoning(), true);
  assert.strictEqual(a.supportsTemperature(), false); // reasoning != 'none' désactive temp
});

test('OpenAI Responses + reasoning=none : temperature activée', () => {
  const a = createAdapter('openai', { apiKey: 'x', model: 'gpt-5.2', reasoningEffort: 'none' });
  assert.strictEqual(a.supportsTemperature(), true);
});

// ─────────────────────────────────────────────────────────────────────────
// Tests : parité événementielle des 3 adapters (le contrat-clé)
// ─────────────────────────────────────────────────────────────────────────

test('parité : end_turn normal → stop + done sur les 3 providers', async () => {
  // Anthropic
  const anth = mockAdapter(AnthropicAdapter, { model: 'claude-opus-4-7' }, [
    { type: 'text_delta', text: 'Bonjour' },
    { type: 'done', usage: { input_tokens: 50, output_tokens: 10 }, stopReasonRaw: 'end_turn' },
  ]);
  const anthEvents = await collect(anth);
  // OpenAI Chat
  const oai = mockAdapter(OpenAiChatAdapter, { model: 'gpt-4o' }, [
    { type: 'text_delta', text: 'Bonjour' },
    { type: 'done', usage: { prompt_tokens: 50, completion_tokens: 10 }, stopReasonRaw: 'stop' },
  ]);
  const oaiEvents = await collect(oai);
  // OpenAI Responses
  const oair = mockAdapter(OpenAiResponsesAdapter, { model: 'gpt-5.2' }, [
    { type: 'text_delta', text: 'Bonjour' },
    { type: 'done', usage: { input_tokens: 50, output_tokens: 10 }, stopReasonRaw: 'completed' },
  ]);
  const oairEvents = await collect(oair);

  // Les 3 doivent émettre la même séquence de types : text_delta, stop, done
  for (const evs of [anthEvents, oaiEvents, oairEvents]) {
    assert.deepStrictEqual(evs.map(e => e.type), ['text_delta', 'stop', 'done']);
    assert.strictEqual(evs[1].reason, 'end_turn');
    assert.strictEqual(evs[2].stopReason, 'end_turn');
    assert.strictEqual(evs[2].truncated, false);
    // Usage présent et complet (5 champs)
    assert.deepStrictEqual(Object.keys(evs[2].usage).sort(), ['cached_creation', 'cached_read', 'input', 'output', 'reasoning']);
    assert.strictEqual(evs[2].usage.input, 50);
    assert.strictEqual(evs[2].usage.output, 10);
  }
});

test('parité : max_tokens → truncated=true sur les 3 providers', async () => {
  const anth = mockAdapter(AnthropicAdapter, { model: 'claude-opus-4-7' }, [
    { type: 'done', usage: { input_tokens: 1000, output_tokens: 4096 }, stopReasonRaw: 'max_tokens' },
  ]);
  const oai = mockAdapter(OpenAiChatAdapter, { model: 'gpt-4o' }, [
    { type: 'done', usage: { prompt_tokens: 1000, completion_tokens: 4096 }, stopReasonRaw: 'length' },
  ]);
  const oair = mockAdapter(OpenAiResponsesAdapter, { model: 'gpt-5.2' }, [
    { type: 'done', usage: { input_tokens: 1000, output_tokens: 4096 }, stopReasonRaw: 'incomplete' },
  ]);

  for (const adapter of [anth, oai, oair]) {
    const events = await collect(adapter);
    const done = events.find(e => e.type === 'done');
    assert.strictEqual(done.stopReason, 'max_tokens', `${adapter.provider} doit normaliser sur max_tokens`);
    assert.strictEqual(done.truncated, true, `${adapter.provider} doit marquer truncated`);
  }
});

test('parité : tool_use stop_reason sur 2 providers (Anthropic + OpenAI Chat)', async () => {
  const anth = mockAdapter(AnthropicAdapter, { model: 'claude-sonnet-4-5' }, [
    { type: 'tool_use_start', index: 0, id: 't1', name: 'read_file' },
    { type: 'tool_use_end', index: 0, id: 't1', name: 'read_file', input: {} },
    { type: 'done', usage: {}, stopReasonRaw: 'tool_use' },
  ]);
  const oai = mockAdapter(OpenAiChatAdapter, { model: 'gpt-4o' }, [
    { type: 'tool_use_start', index: 0, id: 't1', name: 'read_file' },
    { type: 'tool_use_end', index: 0, id: 't1', name: 'read_file', input: {} },
    { type: 'done', usage: {}, stopReasonRaw: 'tool_calls' },
  ]);

  for (const adapter of [anth, oai]) {
    const events = await collect(adapter);
    const done = events.find(e => e.type === 'done');
    assert.strictEqual(done.stopReason, 'tool_use');
    assert.strictEqual(done.truncated, false);
  }
});

test('parité : si raw stream crash sans done → adapter émet quand même stop+done', async () => {
  const broken = new AnthropicAdapter({ model: 'claude-sonnet-4-5' });
  broken._rawStream = async function* () {
    yield { type: 'text_delta', text: 'partiel' };
    throw new Error('Network broken');
  };
  let caught = null;
  let lastDone = null;
  try {
    for await (const ev of broken.stream([], [])) {
      if (ev.type === 'done') lastDone = ev;
    }
  } catch (e) { caught = e; }
  assert.ok(caught, 'erreur réelle propagée');
  assert.strictEqual(caught.message, 'Network broken');
  // Le finally garantit un done même sur crash — vérifions qu'il a été émis avant le throw
  assert.ok(lastDone, 'done DOIT être émis par le finally');
  assert.strictEqual(lastDone.stopReason, 'error');
  assert.deepStrictEqual(Object.keys(lastDone.usage).sort(), ['cached_creation', 'cached_read', 'input', 'output', 'reasoning']);
});

test('parité : reasoning tokens préservés sur OpenAI Responses uniquement', async () => {
  const oair = mockAdapter(OpenAiResponsesAdapter, { model: 'gpt-5.2' }, [
    { type: 'done', usage: { input_tokens: 100, output_tokens: 50, output_tokens_details: { reasoning_tokens: 800 } }, stopReasonRaw: 'completed' },
  ]);
  const events = await collect(oair);
  const done = events.find(e => e.type === 'done');
  assert.strictEqual(done.usage.reasoning, 800);
});

test('parité : cache tokens préservés sur Anthropic', async () => {
  const anth = mockAdapter(AnthropicAdapter, { model: 'claude-sonnet-4-5' }, [
    { type: 'done', usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 500, cache_read_input_tokens: 8000 }, stopReasonRaw: 'end_turn' },
  ]);
  const events = await collect(anth);
  const done = events.find(e => e.type === 'done');
  assert.strictEqual(done.usage.cached_creation, 500);
  assert.strictEqual(done.usage.cached_read, 8000);
});

test('backward compat : harness lit toujours done.usage.input et done.usage.output', async () => {
  // Le harness actuel fait : totalUsage.input += event.usage.input || 0;
  // On vérifie que c'est toujours possible avec la nouvelle structure.
  const adapter = mockAdapter(OpenAiChatAdapter, { model: 'gpt-4o' }, [
    { type: 'done', usage: { prompt_tokens: 200, completion_tokens: 75 }, stopReasonRaw: 'stop' },
  ]);
  const events = await collect(adapter);
  const done = events.find(e => e.type === 'done');
  assert.strictEqual(done.usage.input, 200);
  assert.strictEqual(done.usage.output, 75);
});
