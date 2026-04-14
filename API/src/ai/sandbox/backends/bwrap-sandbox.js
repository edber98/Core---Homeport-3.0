// Backend bubblewrap : exécution isolée via user namespaces.
// Prépare un scratch éphémère, spawn bwrap + prlimit, capture stdout/stderr,
// collecte les fichiers produits et nettoie.

const os = require('os');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { spawn } = require('child_process');
const { listProducedFiles, coerceOutput, which } = require('../utils');

const MAX_OUTPUT_BYTES = 1024 * 1024; // 1 Mo par flux
const DEFAULT_TIMEOUT = 30_000;

/** Petit helper : existe-t-il un fichier/dossier ? */
function existsSync(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

/**
 * Copie un fichier hôte dans le dossier scratch/in.
 * @param {string} hostPath
 * @param {string} destPath
 */
async function copyInputFile(hostPath, destPath) {
  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  await fsp.copyFile(hostPath, destPath);
}

/**
 * Exécute du code dans un bubblewrap isolé.
 * @param {object} opts
 * @param {'python'|'node'} opts.language
 * @param {string} opts.code
 * @param {string} [opts.stdin]
 * @param {number} [opts.timeoutMs=30000]
 * @param {boolean} [opts.allowNetwork=false]
 * @param {Array<{hostPath:string, name:string}>} [opts.filesIn]
 * @param {string[]} [opts.cmdOverride]
 * @returns {Promise<{stdout:string,stderr:string,exitCode:number,duration:number,producedFiles:Array,timedOut:boolean}>}
 */
async function run(opts) {
  const language = opts.language;
  if (!language || (language !== 'python' && language !== 'node')) {
    throw new Error(`bwrap-sandbox: unsupported language "${language}"`);
  }
  const timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : DEFAULT_TIMEOUT;
  const allowNetwork = !!opts.allowNetwork;
  const filesIn = Array.isArray(opts.filesIn) ? opts.filesIn : [];

  const startedAt = Date.now();

  // 1. Prépare le répertoire scratch (hôte)
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), 'sbx-'));
  const scratchIn = path.join(scratch, 'in');
  const scratchOut = path.join(scratch, 'out');
  await fsp.mkdir(scratchIn, { recursive: true });
  await fsp.mkdir(scratchOut, { recursive: true });

  // 2. Copie les fichiers d'entrée
  for (const f of filesIn) {
    if (!f || !f.hostPath || !f.name) continue;
    // On empêche toute évasion de répertoire via le nom (..)
    const safeName = path.basename(f.name);
    await copyInputFile(f.hostPath, path.join(scratchIn, safeName));
  }

  // 3. Écrit le script
  const scriptName = language === 'python' ? 'script.py' : 'script.js';
  const scriptHostPath = path.join(scratch, scriptName);
  await fsp.writeFile(scriptHostPath, String(opts.code || ''), 'utf8');

  // 4. Construit la commande invoquée à l'intérieur du sandbox
  const innerCmd = Array.isArray(opts.cmdOverride) && opts.cmdOverride.length
    ? opts.cmdOverride
    : (language === 'python'
      ? ['python3', '/workspace/script.py']
      : ['node', '/workspace/script.js']);

  // 5. Args bwrap
  const bwrapArgs = [
    '--die-with-parent',
    '--unshare-all',
  ];
  if (allowNetwork) bwrapArgs.push('--share-net');
  bwrapArgs.push('--uid', '65534', '--gid', '65534');

  const roBinds = ['/usr', '/lib', '/lib64', '/bin'];
  for (const p of roBinds) {
    if (existsSync(p)) bwrapArgs.push('--ro-bind', p, p);
  }
  if (existsSync('/etc/ssl')) bwrapArgs.push('--ro-bind', '/etc/ssl', '/etc/ssl');
  if (existsSync('/etc/ca-certificates')) bwrapArgs.push('--ro-bind', '/etc/ca-certificates', '/etc/ca-certificates');

  if (allowNetwork) {
    for (const p of ['/etc/resolv.conf', '/etc/nsswitch.conf', '/etc/hosts']) {
      if (existsSync(p)) bwrapArgs.push('--ro-bind', p, p);
    }
  }

  bwrapArgs.push('--proc', '/proc');
  bwrapArgs.push('--dev', '/dev');
  bwrapArgs.push('--tmpfs', '/tmp');
  bwrapArgs.push('--bind', scratch, '/workspace');
  if (filesIn.length > 0) {
    // Monte scratch/in en lecture seule (après le bind principal)
    bwrapArgs.push('--ro-bind', scratchIn, '/workspace/in');
  }
  bwrapArgs.push('--chdir', '/workspace');
  bwrapArgs.push('--setenv', 'HOME', '/workspace');
  bwrapArgs.push('--setenv', 'PATH', '/usr/local/bin:/usr/bin:/bin');

  // 6. Wrapping prlimit (RAM 512 Mo, CPU 30s, 32 proc, 64 fd)
  // prlimit --as=536870912 --cpu=30 --nproc=32 --nofile=64 bwrap ...
  const prlimitBin = which('prlimit');
  const bwrapBin = which('bwrap');
  if (!bwrapBin) {
    await fsp.rm(scratch, { recursive: true, force: true });
    throw new Error('bwrap-sandbox: binary "bwrap" not found in PATH');
  }

  let spawnBin, spawnArgs;
  if (prlimitBin) {
    spawnBin = prlimitBin;
    spawnArgs = [
      '--as=536870912',
      '--cpu=30',
      '--nproc=32',
      '--nofile=64',
      bwrapBin,
      ...bwrapArgs,
      ...innerCmd,
    ];
  } else {
    // prlimit absent → fallback direct bwrap (warning dans stderr coté backend index)
    spawnBin = bwrapBin;
    spawnArgs = [...bwrapArgs, ...innerCmd];
  }

  // 7. Spawn + capture
  const child = spawn(spawnBin, spawnArgs, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const outCap = coerceOutput(child.stdout, MAX_OUTPUT_BYTES);
  const errCap = coerceOutput(child.stderr, MAX_OUTPUT_BYTES);

  // stdin
  if (opts.stdin != null) {
    try { child.stdin.write(String(opts.stdin)); } catch { /* ignore */ }
  }
  try { child.stdin.end(); } catch { /* ignore */ }

  // Timeout wallclock
  let timedOut = false;
  const killTimer = setTimeout(() => {
    timedOut = true;
    try { child.kill('SIGKILL'); } catch { /* ignore */ }
  }, Math.max(1, timeoutMs));

  const exitInfo = await new Promise((resolve) => {
    child.on('error', (err) => {
      resolve({ code: 1, signal: null, error: err });
    });
    child.on('close', (code, signal) => {
      resolve({ code, signal, error: null });
    });
  });
  clearTimeout(killTimer);

  const duration = Date.now() - startedAt;
  let exitCode = timedOut ? 124 : (exitInfo.code == null ? 1 : exitInfo.code);
  let stderr = errCap.getString();
  if (exitInfo.error) {
    stderr += (stderr ? '\n' : '') + `[sandbox] spawn error: ${exitInfo.error.message}`;
  }
  if (outCap.truncated) {
    stderr += (stderr ? '\n' : '') + '[sandbox] stdout truncated at 1 MB';
  }
  if (errCap.truncated) {
    stderr += (stderr ? '\n' : '') + '[sandbox] stderr truncated at 1 MB';
  }

  // 8. Collecte des fichiers produits (exclut script source + scratch/in)
  const excludes = [scriptHostPath];
  if (filesIn.length > 0) excludes.push(scratchIn);
  let producedFiles = [];
  try {
    const found = await listProducedFiles(scratch, excludes);
    // Copie chaque fichier produit dans un emplacement temp stable (hors scratch qu'on supprime)
    const outStage = await fsp.mkdtemp(path.join(os.tmpdir(), 'sbx-out-'));
    for (const f of found) {
      const rel = path.relative(scratch, f.path);
      const dest = path.join(outStage, rel);
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      await fsp.copyFile(f.path, dest);
      producedFiles.push({ path: rel, hostPath: dest, size: f.size });
    }
  } catch { /* best-effort */ }

  // 9. Nettoyage scratch
  try { await fsp.rm(scratch, { recursive: true, force: true }); } catch { /* ignore */ }

  return {
    stdout: outCap.getString(),
    stderr,
    exitCode,
    duration,
    producedFiles,
    timedOut,
  };
}

module.exports = { name: 'bwrap', run };
