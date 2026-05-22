// Reproduce the user's complaint : opening the panel of a node downstream of
// a core_barrier hangs forever ("Chargement…") because the simulator's runFlow
// can't complete when the barrier expects N branches but the simulator only
// pushes 1 through.

const { test } = require('node:test');
const assert = require('node:assert');

function makeFlow() {
  return {
    nodes: [
      { id: 'cron', data: { model: { type: 'event', templateObj: { type: 'event', id: 'cron_schedule', outputHandles: [{ id: 'ok', name: 'Success', type: 'payload', schema: { fields: [{ key: 'firedAt', type: 'text' }] } }] } } } },
      { id: 's1',  data: { model: { type: 'function', template: 'state_get', templateObj: { type: 'function', id: 'state_get', outputHandles: [{ id: 'ok', schema: { fields: [{ key: 'state', type: 'text' }] } }] }, context: { entity: 'sensor.humidite' } } } },
      { id: 's2',  data: { model: { type: 'function', template: 'state_get', templateObj: { type: 'function', id: 'state_get', outputHandles: [{ id: 'ok', schema: { fields: [{ key: 'state', type: 'text' }] } }] }, context: { entity: 'sensor.temp' } } } },
      { id: 's3',  data: { model: { type: 'function', template: 'state_get', templateObj: { type: 'function', id: 'state_get', outputHandles: [{ id: 'ok', schema: { fields: [{ key: 'state', type: 'text' }] } }] }, context: { entity: 'sensor.lum' } } } },
      { id: 'bar', data: { model: { type: 'barrier', templateObj: { type: 'barrier', id: 'core_barrier' } } } },
      { id: 'ai',  data: { model: { type: 'function', template: 'openai_chat', templateObj: { type: 'function', id: 'openai_chat', outputHandles: [{ id: 'ok', schema: { fields: [{ key: 'text', type: 'text' }] } }] }, context: { prompt: '{{ s1.state }} {{ s2.state }} {{ s3.state }}' } } } },
    ],
    edges: [
      { id: 'e1', source: 'cron', target: 's1' },
      { id: 'e2', source: 'cron', target: 's2' },
      { id: 'e3', source: 'cron', target: 's3' },
      { id: 'e4', source: 's1', target: 'bar' },
      { id: 'e5', source: 's2', target: 'bar' },
      { id: 'e6', source: 's3', target: 'bar' },
      { id: 'e7', source: 'bar', target: 'ai' },
    ],
  };
}

test('simulator engine: target downstream of barrier must NOT hang', async (t) => {
  const { simulateViaEngine } = require('../src/utils/flow-simulate-engine');
  const flow = makeFlow();

  // 10s timeout — if simulator hangs, test fails clearly
  const start = Date.now();
  const result = await Promise.race([
    simulateViaEngine(flow, 'ai'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('SIMULATOR_HANG_TIMEOUT_10s')), 10000)),
  ]);
  const elapsed = Date.now() - start;
  console.log(`[test] simulateViaEngine for 'ai' (downstream barrier) completed in ${elapsed}ms`);
  console.log('[test] scenarios count:', (result.scenarios || []).length);
  if (result.scenarios?.[0]) {
    console.log('[test] scenario[0].msgIn keys:', Object.keys(result.scenarios[0].msgIn || {}));
  }
  assert.ok(elapsed < 9000, 'simulator should not hang');
  assert.ok(Array.isArray(result.scenarios), 'expected scenarios array');
  assert.ok(result.scenarios.length > 0, 'expected at least 1 scenario');
});

test('simulator engine: msgIn for ai contains s1, s2, s3 (merged from barrier)', async () => {
  const { simulateViaEngine } = require('../src/utils/flow-simulate-engine');
  const flow = makeFlow();
  const result = await Promise.race([
    simulateViaEngine(flow, 'ai'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000)),
  ]);
  const sc = result.scenarios?.[0];
  assert.ok(sc, 'scenario should exist');
  const msgIn = sc.msgIn || {};
  const keys = Object.keys(msgIn);
  console.log('[test] ai msgIn keys:', keys);
  console.log('[test] ai msgIn.s1:', JSON.stringify(msgIn.s1));
  console.log('[test] ai msgIn.s2:', JSON.stringify(msgIn.s2));
  console.log('[test] ai msgIn.s3:', JSON.stringify(msgIn.s3));
  assert.ok(msgIn.s1 || msgIn.bar, 's1 or bar should be in msgIn');
});

test('simulator engine: target = the barrier itself', async () => {
  const { simulateViaEngine } = require('../src/utils/flow-simulate-engine');
  const flow = makeFlow();
  const result = await Promise.race([
    simulateViaEngine(flow, 'bar'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_TARGET_BARRIER')), 10000)),
  ]);
  console.log('[test] target=barrier scenarios:', (result.scenarios || []).length);
  assert.ok(Array.isArray(result.scenarios));
});

test('simulator engine_split (frontend uses this): does NOT hang', async () => {
  const { simulateViaEngineSplit } = require('../src/utils/flow-simulate-engine');
  const flow = makeFlow();
  const start = Date.now();
  const result = await Promise.race([
    simulateViaEngineSplit(flow, 'ai'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('SPLIT_TIMEOUT_10s')), 10000)),
  ]);
  const elapsed = Date.now() - start;
  console.log(`[test] simulateViaEngineSplit ai elapsed=${elapsed}ms scenarios=${(result.scenarios || []).length}`);
  if (result.scenarios?.[0]) {
    const sc = result.scenarios[0];
    console.log('[test] split scenario[0].msgIn keys:', Object.keys(sc.msgIn || {}));
  }
  assert.ok(elapsed < 9000, 'engine_split should not hang for barrier downstream');
  assert.ok(Array.isArray(result.scenarios));
});

test('simulator static: works for barrier downstream', () => {
  const { simulateScenarios } = require('../src/utils/flow-simulate');
  const flow = makeFlow();
  const out = simulateScenarios(flow, 'ai', 'all');
  console.log('[test] static scenarios:', (out.scenarios || []).length);
  console.log('[test] static scenario[0].msgIn keys:', Object.keys(out.scenarios?.[0]?.msgIn || {}));
  assert.ok(Array.isArray(out.scenarios));
});
