const { test } = require('node:test');
const assert = require('node:assert');

test('engine v2: incoming by handle for memory -> agent', async () => {
  const { runFlow } = require('../src/engine');
  const { registry } = require('../src/plugins/registry');

  // Register test handlers
  registry.register('dummy_memory', async (_node, _msg, inputs) => {
    const text = String((inputs && inputs.text) || '');
    return { ok: true, type: 'ai_memory', texts: [text], vectors: [[0.1, 0.2]] };
  });
  registry.register('dummy_agent', async (_node, _msg, _inputs, opts) => {
    const mem = (opts && opts.incoming && opts.incoming.byHandle && opts.incoming.byHandle['memory']) || [];
    return { ok: true, usedMemory: mem.length };
  });

  const flow = {
    nodes: [
      { id: 'n_start', data: { model: { type: 'start', templateObj: { name: 'start' }, context: {} } } },
      { id: 'n_mem', data: { model: { type: 'memory', templateObj: { name: 'memory', id: 'dummy_memory' }, context: { text: 'hello' } } } },
      { id: 'n_agent', data: { model: { type: 'agent', templateObj: { name: 'agent', id: 'dummy_agent' }, context: { prompt: 'do something' } } } }
    ],
    edges: [
      { id: 'e1', source: 'n_start', target: 'n_mem' },
      { id: 'e2', source: 'n_mem', target: 'n_agent', sourceHandle: 'memory', targetHandle: 'memory' }
    ]
  };

  const out = await runFlow(flow, {}, { payload: null }, async () => {});
  assert.ok(out && out.payload && out.payload.ok === true, 'agent should produce ok payload');
  assert.ok(typeof out.payload.usedMemory === 'number' && out.payload.usedMemory >= 1, 'agent should receive memory via incoming');
});

