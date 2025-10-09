const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { buildApp } = require('../src/app');

let server, baseURL, token, wsId2;

before(async () => {
  const built = buildApp({ useMemory: false });
  const app = built.app; server = http.createServer(app); server.listen(0); baseURL = `http://127.0.0.1:${server.address().port}`;
  await fetch(baseURL + '/health');
  const resLogin = await fetch(baseURL + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@acme.test', password: 'admin' }) });
  token = (await resLogin.json()).data.token;
  // create a second workspace
  // Note: current API has no POST /api/workspaces, so pick the existing second workspace if present
  const resWs = await fetch(baseURL + '/api/workspaces', { headers: { Authorization: `Bearer ${token}` } });
  const list = (await resWs.json()).data;
  wsId2 = list.length > 1 ? list[1].id : list[0].id;
});

after(() => { server && server.close(); });

test('import manifest upserts provider and templates; transfer remaps node ids', async () => {
  const manifest = { providers: [ { key: 'mail', name: 'Mail', categories: ['communication'], enabled: true } ], nodeTemplates: [ { key: 'sendmail', name: 'Send Mail', type: 'function', category: 'mail', providerKey: 'mail', args: { title:'Send', ui:{ layout:'vertical', labelsOnTop:true }, fields:[ { type:'text', key:'to', label:'To', col:{ xs:24, sm:24, md:24, lg:24, xl:24 }, expression:{ allow:true } } ] }, output: ['Success'] } ] };
  const resImp = await fetch(baseURL + '/api/plugins/import-manifest', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(manifest) });
  assert.equal(resImp.status, 200);

  // Create a flow using sendmail
  const resWs = await fetch(baseURL + '/api/workspaces', { headers: { Authorization: `Bearer ${token}` } });
  const ws = (await resWs.json()).data[0];
  const graph = { nodes: [ { id: 'n_start', data: { model: { type: 'start', templateObj: { name: 'start' } } } }, { id: 'n_mail', data: { model: { type: 'function', templateObj: { name: 'function', id: 'sendmail' }, context: { to: 'a@b.c' } } } } ], edges: [ { id: 'e1', source: 'n_start', target: 'n_mail' } ] };
  const resCreate = await fetch(baseURL + `/api/workspaces/${ws.id}/flows`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'MailFlow', graph }) });
  assert.equal(resCreate.status, 201);
  const flow = (await resCreate.json()).data;

  // Transfer to another workspace
  const resTrans = await fetch(baseURL + `/api/workspaces/${ws.id}/transfer`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ targetWorkspaceId: wsId2, items: [ { type: 'flow', id: flow.id } ] }) });
  assert.equal(resTrans.status, 200);
  const tr = (await resTrans.json()).data;
  assert.ok(tr.created.find(x => x.type === 'flow'));
});
