const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { buildApp } = require('../src/app');

let server, app, store, baseURL;

before(() => {
  const built = buildApp();
  app = built.app; store = built.store;
  server = http.createServer(app);
  server.listen(0);
  const { port } = server.address();
  baseURL = `http://127.0.0.1:${port}`;
});

after(() => {
  server && server.close();
});

test('login works and lists company workspaces', async () => {
  const resLogin = await fetch(baseURL + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@acme.test', password: 'admin' }) });
  assert.equal(resLogin.status, 200);
  const bodyLogin = await resLogin.json();
  const token = bodyLogin.data?.token || bodyLogin.token; // handle both shapes
  assert.ok(token);

  const resCompany = await fetch(baseURL + '/api/company', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(resCompany.status, 200);
  const companyBody = await resCompany.json();
  const company = companyBody.data ?? companyBody;
  assert.equal(typeof company.id, 'string');

  const resWs = await fetch(baseURL + '/api/workspaces', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(resWs.status, 200);
  const wsBody = await resWs.json();
  const ws = wsBody.data ?? wsBody;
  assert.ok(Array.isArray(ws));
  assert.ok(ws.length >= 1);
});
