// Tests pour le node condition avec evaluation_mode = 'parallel'.
// Vérifie qu'en mode parallel, TOUTES les branches matchantes se déclenchent
// simultanément, alors qu'en mode exclusive seule la première matche.

const { test } = require('node:test');
const assert = require('node:assert');

// Register a no-op handler for the 'echo' template used by sink nodes
const { registry } = require('../src/plugins/registry');
registry.register('echo', async () => ({ ok: true }));

function makeFlow({ evaluationMode, elseEnabled = false, payload = {} } = {}) {
  // Condition à 3 branches : cold (T<18), humid (H>80), bright (L>500).
  // Pour les tests on contrôle les valeurs via le payload initial.
  const items = [
    { _id: 'cold',   name: 'cold',   condition: '{{ payload.T < 18 }}' },
    { _id: 'humid',  name: 'humid',  condition: '{{ payload.H > 80 }}' },
    { _id: 'bright', name: 'bright', condition: '{{ payload.L > 500 }}' },
  ];
  return {
    flow: {
      nodes: [
        { id: 'start', data: { model: { type: 'start', templateObj: { type: 'start', name: 'start' }, context: {} } } },
        {
          id: 'cond',
          data: {
            model: {
              type: 'condition',
              templateObj: { type: 'condition', name: 'condition', output_array_field: 'items' },
              context: { evaluation_mode: evaluationMode, items, else_enabled: elseEnabled, else: { _id: 'else' } },
            },
          },
        },
        { id: 'sinkCold',   data: { model: { type: 'function', template: 'echo', templateObj: { type: 'function', name: 'echo', id: 'echo' }, context: {} } } },
        { id: 'sinkHumid',  data: { model: { type: 'function', template: 'echo', templateObj: { type: 'function', name: 'echo', id: 'echo' }, context: {} } } },
        { id: 'sinkBright', data: { model: { type: 'function', template: 'echo', templateObj: { type: 'function', name: 'echo', id: 'echo' }, context: {} } } },
        { id: 'sinkElse',   data: { model: { type: 'function', template: 'echo', templateObj: { type: 'function', name: 'echo', id: 'echo' }, context: {} } } },
      ],
      edges: [
        { id: 'e0', source: 'start', target: 'cond' },
        { id: 'e1', source: 'cond', target: 'sinkCold',   sourceHandle: 'cold' },
        { id: 'e2', source: 'cond', target: 'sinkHumid',  sourceHandle: 'humid' },
        { id: 'e3', source: 'cond', target: 'sinkBright', sourceHandle: 'bright' },
        { id: 'e4', source: 'cond', target: 'sinkElse',   sourceHandle: 'else' },
      ],
    },
    initialMsg: { payload },
  };
}

async function runAndCollectEdges(flow, initialMsg) {
  const { runFlow } = require('../src/engine');
  const edges = [];
  await runFlow(flow, {}, initialMsg, async (ev) => {
    if (ev?.type === 'edge.taken' && ev.sourceId === 'cond') {
      edges.push(String(ev.targetId));
    }
  });
  return edges.sort();
}

test('exclusive (default): only the FIRST matching branch fires', async () => {
  const { flow, initialMsg } = makeFlow({
    evaluationMode: 'exclusive',
    payload: { T: 10, H: 90, L: 700 }, // toutes les 3 conditions vraies
  });
  const fired = await runAndCollectEdges(flow, initialMsg);
  console.log('[test] exclusive fired sinks:', fired);
  assert.deepStrictEqual(fired, ['sinkCold'], 'exclusive should fire ONLY the first match');
});

test('parallel: ALL matching branches fire simultaneously', async () => {
  const { flow, initialMsg } = makeFlow({
    evaluationMode: 'parallel',
    payload: { T: 10, H: 90, L: 700 }, // 3 vraies
  });
  const fired = await runAndCollectEdges(flow, initialMsg);
  console.log('[test] parallel (3 true) fired sinks:', fired);
  assert.deepStrictEqual(fired, ['sinkBright', 'sinkCold', 'sinkHumid'], 'parallel should fire ALL 3 matches');
});

test('parallel: only matching branches fire (2 vraies, 1 fausse)', async () => {
  const { flow, initialMsg } = makeFlow({
    evaluationMode: 'parallel',
    payload: { T: 10, H: 90, L: 100 }, // L<500 → bright faux
  });
  const fired = await runAndCollectEdges(flow, initialMsg);
  console.log('[test] parallel (2 true, 1 false) fired sinks:', fired);
  assert.deepStrictEqual(fired, ['sinkCold', 'sinkHumid'], 'parallel should fire ONLY matching branches');
});

test('parallel + else_enabled: else fires when NO match', async () => {
  const { flow, initialMsg } = makeFlow({
    evaluationMode: 'parallel',
    elseEnabled: true,
    payload: { T: 25, H: 50, L: 200 }, // aucune
  });
  const fired = await runAndCollectEdges(flow, initialMsg);
  console.log('[test] parallel no-match (else on) fired sinks:', fired);
  assert.deepStrictEqual(fired, ['sinkElse'], 'else branch should fire as fallback');
});

test('exclusive + else_enabled: else fires when NO match', async () => {
  const { flow, initialMsg } = makeFlow({
    evaluationMode: 'exclusive',
    elseEnabled: true,
    payload: { T: 25, H: 50, L: 200 },
  });
  const fired = await runAndCollectEdges(flow, initialMsg);
  console.log('[test] exclusive no-match (else on) fired sinks:', fired);
  assert.deepStrictEqual(fired, ['sinkElse']);
});

test('parallel: 1 seule branche matche → 1 seule branche fire', async () => {
  const { flow, initialMsg } = makeFlow({
    evaluationMode: 'parallel',
    payload: { T: 10, H: 50, L: 100 },
  });
  const fired = await runAndCollectEdges(flow, initialMsg);
  console.log('[test] parallel (1 true) fired sinks:', fired);
  assert.deepStrictEqual(fired, ['sinkCold']);
});

test('legacy: missing evaluation_mode falls back to exclusive', async () => {
  // Pas de evaluation_mode dans context → comportement actuel (firstMatch)
  const items = [
    { _id: 'a', name: 'a', condition: '{{ payload.x > 0 }}' },
    { _id: 'b', name: 'b', condition: '{{ payload.x > 0 }}' },
  ];
  const flow = {
    nodes: [
      { id: 'start', data: { model: { type: 'start', templateObj: { type: 'start', name: 'start' }, context: {} } } },
      { id: 'cond',  data: { model: { type: 'condition', templateObj: { type: 'condition', name: 'condition' }, context: { items } } } },
      { id: 'a',     data: { model: { type: 'function', template: 'echo', templateObj: { type: 'function', name: 'echo', id: 'echo' }, context: {} } } },
      { id: 'b',     data: { model: { type: 'function', template: 'echo', templateObj: { type: 'function', name: 'echo', id: 'echo' }, context: {} } } },
    ],
    edges: [
      { id: 'e0', source: 'start', target: 'cond' },
      { id: 'e1', source: 'cond',  target: 'a', sourceHandle: 'a' },
      { id: 'e2', source: 'cond',  target: 'b', sourceHandle: 'b' },
    ],
  };
  const fired = await runAndCollectEdges(flow, { payload: { x: 1 } });
  console.log('[test] legacy fired sinks:', fired);
  assert.deepStrictEqual(fired, ['a'], 'legacy (no evaluation_mode) should behave as exclusive');
});
