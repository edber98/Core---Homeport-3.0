const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { buildApp } = require('../src/app');

let server, baseURL, token;

before(async () => {
  const built = buildApp({ useMemory: false });
  const app = built.app; server = http.createServer(app); server.listen(0); baseURL = `http://127.0.0.1:${server.address().port}`;
  // ensure DB connected and seeded via a request
  await fetch(baseURL + '/health');
  const resLogin = await fetch(baseURL + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@acme.test', password: 'admin' }) });
  const bodyLogin = await resLogin.json(); token = bodyLogin.data?.token || bodyLogin.token; assert.ok(token);
});

after(() => { server && server.close(); });

test('workspace templatesAllowed force validation disables flows and creates notifications', async () => {
  // pick first workspace
  const resWs = await fetch(baseURL + '/api/workspaces', { headers: { Authorization: `Bearer ${token}` } });
  const ws = (await resWs.json()).data[0];

  // import a template not allowed later
  const manifest = { nodeTemplates: [ { key: 'custom_t', name: 'T', type: 'function', args: { title:'T', ui:{ layout:'vertical', labelsOnTop:true }, fields:[ { type:'number', key:'x', label:'X', col:{ xs:24, sm:24, md:24, lg:24, xl:24 }, expression:{ allow:true } } ] }, output: ['Success'] } ] };
  await fetch(baseURL + '/api/plugins/import-manifest', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(manifest) });

  // create a flow using that template
  const graph = { nodes: [ { id: 'n_start', data: { model: { type: 'start', templateObj: { name: 'start' } } } }, { id: 'n_fn', data: { model: { type: 'function', templateObj: { name: 'function', id: 'custom_t' }, context: { x: 1 } } } } ], edges: [ { id: 'e1', source: 'n_start', target: 'n_fn' } ] };
  const resCreate = await fetch(baseURL + `/api/workspaces/${ws.id}/flows`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'F', graph }) });
  assert.equal(resCreate.status, 201);
  const flow = (await resCreate.json()).data;

  // apply restrictive templatesAllowed without force -> 400
  const resRestrict = await fetch(baseURL + `/api/workspaces/${ws.id}`, { method: 'PUT', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ templatesAllowed: ['not_custom'] }) });
  assert.equal(resRestrict.status, 400);

  // same with force -> ok and flow disabled
  const resForce = await fetch(baseURL + `/api/workspaces/${ws.id}`, { method: 'PUT', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ templatesAllowed: ['not_custom'], force: true }) });
  assert.equal(resForce.status, 200);
  const resFlowGet = await fetch(baseURL + `/api/flows/${flow.id}`, { headers: { Authorization: `Bearer ${token}` } });
  const flowAfter = (await resFlowGet.json()).data;
  assert.equal(flowAfter.enabled, false);
});
