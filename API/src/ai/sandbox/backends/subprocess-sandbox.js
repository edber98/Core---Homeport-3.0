// Backend subprocess : fallback quand bwrap/userns ne sont pas disponibles.
// Isolation réduite : on s'appuie sur prlimit + éventuellement changement d'UID.
// Un warning est écrit en stderr pour rappeler l'absence de sandbox forte.

const os = require('os');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { spawn } = require('child_process');
const { listProducedFiles, coerceOutput, which } = require('../utils');

const MAX_OUTPUT_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT = 30_000;

function existsSync(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

async function copyInputFile(hostPath, destPath) {
  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  await fsp.copyFile(hostPath, destPath);
}

/**
 * Exécute le code dans un sous-processus sans sandbox forte.
 * @param {object} opts — signature identique à bwrap-sandbox.run
 */
async function run(opts) {
  const language = opts.language;
  if (!language || (language !== 'python' && language !== 'node')) {
    throw new Error(`subprocess-sandbox: unsupported language "${language}"`);
  }
  const timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : DEFAULT_TIMEOUT;
  const filesIn = Array.isArray(opts.filesIn) ? opts.filesIn : [];

  const startedAt = Date.now();
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), 'sbx-sub-'));
  const scratchIn = path.join(scratch, 'in');
  const scratchOut = path.join(scratch, 'out');
  await fsp.mkdir(scratchIn, { recursive: true });
  await fsp.mkdir(scratchOut, { recursive: true });

  for (const f of filesIn) {
    if (!f || !f.hostPath || !f.name) continue;
    await copyInputFile(f.hostPath, path.join(scratchIn, path.basename(f.name)));
  }

  const scriptName = language === 'python' ? 'script.py' : 'script.js';
  const scriptHostPath = path.join(scratch, scriptName);
  // Remplace les chemins conventionnels bwrap (/workspace, /workspace/in, /workspace/out)
  // par les vrais chemins scratch car /workspace n'existe pas hors bwrap.
  const rewrittenCode = String(opts.code || '')
    .replace(/\/workspace\/out\b/g, scratchOut)
    .replace(/\/workspace\/in\b/g, scratchIn)
    .replace(/\/workspace\b/g, scratch);
  await fsp.writeFile(scriptHostPath, rewrittenCode, 'utf8');

  // Permet de forcer un interpréteur précis via env (utile sur macOS dev avec miniforge/conda)
  const pythonBin = process.env.AI_SANDBOX_PYTHON || 'python3';
  const nodeBin = process.env.AI_SANDBOX_NODE || 'node';
  const baseCmd = Array.isArray(opts.cmdOverride) && opts.cmdOverride.length
    ? opts.cmdOverride.map((a) => {
        let s = a
          .replace('/workspace/script.py', scriptHostPath)
          .replace('/workspace/script.js', scriptHostPath)
          .replace('/workspace', scratch);
        if (s === 'python3' || s === 'python') s = pythonBin;
        if (s === 'node') s = nodeBin;
        return s;
      })
    : (language === 'python'
      ? [pythonBin, scriptHostPath]
      : [nodeBin, scriptHostPath]);

  // Wrapping prlimit si dispo (Linux seulement)
  const prlimitBin = which('prlimit');
  let spawnBin, spawnArgs;

  // Option : basculer vers un user non privilégié si on tourne en root.
  // `su nobody -c "CMD ..."` — rudimentaire, best-effort, sinon on exécute tel quel.
  const isRoot = process.getuid && process.getuid() === 0;
  const suBin = isRoot ? which('su') : null;

  if (prlimitBin) {
    spawnBin = prlimitBin;
    spawnArgs = [
      '--as=536870912',
      '--cpu=30',
      '--nproc=32',
      '--nofile=64',
      ...baseCmd,
    ];
  } else {
    spawnBin = baseCmd[0];
    spawnArgs = baseCmd.slice(1);
  }

  // Si root + su dispo, on réécrit en `su nobody -c "<bin> <args>"`
  if (suBin) {
    const joined = [spawnBin, ...spawnArgs]
      .map((a) => `'${String(a).replace(/'/g, `'\\''`)}'`)
      .join(' ');
    spawnBin = suBin;
    spawnArgs = ['nobody', '-s', '/bin/sh', '-c', joined];
  }

  const warning = '[sandbox] subprocess backend active — isolation dégradée (pas de bwrap)';
  console.warn(warning);

  // En subprocess mode (dev macOS/Linux sans bwrap), on hérite le PATH parent
  // pour que python3/node résolvent le même binaire que celui de l'utilisateur
  // (miniforge, pyenv, nvm, brew, etc.) et aient accès aux site-packages installées.
  const parentEnv = process.env || {};
  const childEnv = {
    HOME: scratch,
    LANG: parentEnv.LANG || 'C.UTF-8',
    LC_ALL: parentEnv.LC_ALL || 'C.UTF-8',
    PATH: parentEnv.PATH || '/usr/local/bin:/usr/bin:/bin',
    WORKSPACE: scratch,
    WORKSPACE_OUT: scratchOut,
    WORKSPACE_IN: scratchIn,
    // Propage les env critiques pour résolution des libs
    ...(parentEnv.PYTHONPATH ? { PYTHONPATH: parentEnv.PYTHONPATH } : {}),
    ...(parentEnv.VIRTUAL_ENV ? { VIRTUAL_ENV: parentEnv.VIRTUAL_ENV } : {}),
    ...(parentEnv.CONDA_PREFIX ? { CONDA_PREFIX: parentEnv.CONDA_PREFIX } : {}),
    ...(parentEnv.NODE_PATH ? { NODE_PATH: parentEnv.NODE_PATH } : {}),
    ...(parentEnv.TMPDIR ? { TMPDIR: parentEnv.TMPDIR } : {}),
  };
  const child = spawn(spawnBin, spawnArgs, {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: scratch,
    env: childEnv,
  });

  const outCap = coerceOutput(child.stdout, MAX_OUTPUT_BYTES);
  const errCap = coerceOutput(child.stderr, MAX_OUTPUT_BYTES);

  if (opts.stdin != null) {
    try { child.stdin.write(String(opts.stdin)); } catch { /* ignore */ }
  }
  try { child.stdin.end(); } catch { /* ignore */ }

  let timedOut = false;
  const killTimer = setTimeout(() => {
    timedOut = true;
    try { child.kill('SIGKILL'); } catch { /* ignore */ }
  }, Math.max(1, timeoutMs));

  const exitInfo = await new Promise((resolve) => {
    child.on('error', (err) => resolve({ code: 1, signal: null, error: err }));
    child.on('close', (code, signal) => resolve({ code, signal, error: null }));
  });
  clearTimeout(killTimer);

  const duration = Date.now() - startedAt;
  const exitCode = timedOut ? 124 : (exitInfo.code == null ? 1 : exitInfo.code);
  let stderr = errCap.getString();
  // On prépend le warning pour que l'utilisateur le voie dans la réponse outil
  stderr = `${warning}\n${stderr}`;
  if (exitInfo.error) stderr += `\n[sandbox] spawn error: ${exitInfo.error.message}`;
  if (outCap.truncated) stderr += '\n[sandbox] stdout truncated at 1 MB';
  if (errCap.truncated) stderr += '\n[sandbox] stderr truncated at 1 MB';

  const excludes = [scriptHostPath];
  if (filesIn.length > 0) excludes.push(scratchIn);
  let producedFiles = [];
  try {
    const found = await listProducedFiles(scratch, excludes);
    const outStage = await fsp.mkdtemp(path.join(os.tmpdir(), 'sbx-out-'));
    for (const f of found) {
      const rel = path.relative(scratch, f.path);
      const dest = path.join(outStage, rel);
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      await fsp.copyFile(f.path, dest);
      producedFiles.push({ path: rel, hostPath: dest, size: f.size });
    }
  } catch { /* best-effort */ }

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

module.exports = { name: 'subprocess', run };
