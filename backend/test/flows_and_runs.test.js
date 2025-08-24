const { test, before } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { buildApp } = require('../src/app');

let server, app, store, token, wsId, baseURL;

before(async () => {
  const built = buildApp();
  app = built.app; store = built.store;
  server = http.createServer(app);
  server.listen(0);
  const { port } = server.address();
  baseURL = `http://127.0.0.1:${port}`;
  const resLogin = await fetch(baseURL + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@acme.test', password: 'admin' }) });
  const bodyLogin = await resLogin.json();
  token = bodyLogin.data?.token || bodyLogin.token;
  const resWs = await fetch(baseURL + '/api/workspaces', { headers: { Authorization: `Bearer ${token}` } });
  const wsBody = await resWs.json();
  const ws = wsBody.data ?? wsBody;
  wsId = ws[0].id;
});

test('create and run a simple flow', async () => {
  const flowGraph = {
    nodes: [
      { id: 'n_start', data: { model: { type: 'start', templateObj: { name: 'start' }, context: {} } } },
      { id: 'n_fn', data: { model: { type: 'function', templateObj: { name: 'function', id: 'action' }, context: { x: '{{ 40 + 2 }}' } } } }
    ],
    edges: [ { id: 'e1', source: 'n_start', target: 'n_fn' } ]
  };

  const resCreate = await fetch(baseURL + `/api/workspaces/${wsId}/flows`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'T1', graph: flowGraph }) });
  if (resCreate.status !== 201) {
    const t = await resCreate.text(); throw new Error('create failed ' + resCreate.status + ' ' + t);
  }
  const bodyCreate = await resCreate.json();
  const flowId = (bodyCreate.data?.id) || bodyCreate.id;
  assert.ok(flowId);

  const resRun = await fetch(baseURL + `/api/flows/${flowId}/runs`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ payload: { hello: 'world' } }) });
  const runBody = await resRun.json();
  const runId = runBody.data?.id || runBody.id;
  assert.ok(runId);

  // poll until done
  let status = 'running'; let tries = 0;
  while (status === 'running' && tries < 20){
    await new Promise(r => setTimeout(r, 150));
    const res = await fetch(baseURL + `/api/runs/${runId}`, { headers: { Authorization: `Bearer ${token}` } });
    const rb = await res.json();
    const run = rb.data ?? rb;
    status = run.status;
    tries++;
  }
  assert.ok(status === 'completed' || status === 'failed');
});
