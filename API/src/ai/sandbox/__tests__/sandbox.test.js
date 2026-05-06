#!/usr/bin/env node
// Tests basiques de la sandbox. Ne nécessite aucun framework.
// Usage : `node API/src/ai/sandbox/__tests__/sandbox.test.js`
//
// AI_SANDBOX_BACKEND peut être forcé (bwrap|subprocess|none|auto).
// Les tests bwrap/subprocess ne passent que sur Linux avec les bons outils.
// En mode "none" (macOS dev), seuls les tests qui ne dépendent pas de l'isolation
// réseau sont pertinents (le test 3 échouera gracieusement : socket dispo).

const path = require('path');
const sandbox = require('../');

let failed = 0;

function pass(name) { console.log(`  OK  ${name}`); }
function fail(name, reason) {
  failed++;
  console.error(`  KO  ${name} :: ${reason}`);
}

async function test(name, fn) {
  try { await fn(); pass(name); }
  catch (err) { fail(name, err?.stack || err?.message || String(err)); }
}

async function main() {
  await sandbox.init();
  console.log(`[tests] backend: ${sandbox.getBackend()}`);

  // Test 1 : Python simple
  await test('python print("ok")', async () => {
    const r = await sandbox.run({
      language: 'python',
      code: 'print("ok")',
      timeoutMs: 5000,
    });
    if (r.exitCode !== 0) throw new Error(`exitCode=${r.exitCode} stderr=${r.stderr}`);
    if (!/^ok\s*$/.test(r.stdout)) throw new Error(`stdout="${r.stdout}"`);
  });

  // Test 2 : timeout
  await test('python sleep 60s → timeout 2s', async () => {
    const r = await sandbox.run({
      language: 'python',
      code: 'import time; time.sleep(60)',
      timeoutMs: 2000,
    });
    if (!r.timedOut) throw new Error(`timedOut=false stdout="${r.stdout}" stderr="${r.stderr}"`);
    if (r.exitCode !== 124) throw new Error(`exitCode=${r.exitCode}`);
  });

  // Test 3 : réseau bloqué par défaut
  await test('python socket sans allowNetwork → échec', async () => {
    const r = await sandbox.run({
      language: 'python',
      code: "import socket\ntry:\n  s=socket.create_connection(('1.1.1.1',80),timeout=3)\n  s.close()\n  print('NETWORK_OK')\nexcept Exception as e:\n  print('NETWORK_FAIL:', type(e).__name__)",
      timeoutMs: 10_000,
      allowNetwork: false,
    });
    const backend = sandbox.getBackend();
    if (backend === 'bwrap') {
      if (r.stdout.includes('NETWORK_OK')) throw new Error('réseau accessible alors que bwrap/--unshare-all actif');
    } else {
      // subprocess/none n'isolent pas le réseau → on ne durcit pas l'assertion.
      console.log(`    (backend=${backend}) réseau non isolé — test informatif`);
    }
  });

  // Test 4 : fichier produit
  await test('python écrit /workspace/out/result.txt → producedFiles', async () => {
    const r = await sandbox.run({
      language: 'python',
      code: "import os\nos.makedirs('/workspace/out', exist_ok=True)\nopen('/workspace/out/result.txt','w').write('done')",
      timeoutMs: 5000,
    });
    if (r.exitCode !== 0) throw new Error(`exitCode=${r.exitCode} stderr=${r.stderr}`);
    const found = (r.producedFiles || []).find((f) => path.basename(f.path) === 'result.txt');
    if (!found) throw new Error(`result.txt absent, producedFiles=${JSON.stringify(r.producedFiles)}`);
    if (found.size !== 4) throw new Error(`taille inattendue: ${found.size}`);
  });

  console.log('');
  if (failed > 0) {
    console.error(`[tests] ${failed} test(s) en échec`);
    process.exit(1);
  } else {
    console.log('[tests] tous les tests OK');
  }
}

main().catch((err) => {
  console.error('[tests] erreur fatale:', err);
  process.exit(2);
});
