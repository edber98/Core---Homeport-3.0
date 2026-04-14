// Backend "none" : pas de sandbox du tout. RÉSERVÉ au dev local.
// Affiche un warning ASCII visible au moindre appel.

const os = require('os');
const path = require('path');
const fsp = require('fs/promises');
const { spawn } = require('child_process');
const { listProducedFiles, coerceOutput } = require('../utils');

const MAX_OUTPUT_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT = 30_000;

let warned = false;
function warnOnce() {
  if (warned) return;
  warned = true;
  /* eslint-disable no-console */
  console.warn('');
  console.warn('  /!\\  ============================================');
  console.warn('  /!\\  SANDBOX DISABLED — DEV ONLY');
  console.warn('  /!\\  Code runs directly on the host without isolation.');
  console.warn('  /!\\  Never enable this in production!');
  console.warn('  /!\\  ============================================');
  console.warn('');
  /* eslint-enable no-console */
}

async function copyInputFile(hostPath, destPath) {
  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  await fsp.copyFile(hostPath, destPath);
}

async function run(opts) {
  warnOnce();

  const language = opts.language;
  if (!language || (language !== 'python' && language !== 'node')) {
    throw new Error(`no-sandbox: unsupported language "${language}"`);
  }
  const timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : DEFAULT_TIMEOUT;
  const filesIn = Array.isArray(opts.filesIn) ? opts.filesIn : [];

  const startedAt = Date.now();
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), 'sbx-none-'));
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
  await fsp.writeFile(scriptHostPath, String(opts.code || ''), 'utf8');

  const baseCmd = Array.isArray(opts.cmdOverride) && opts.cmdOverride.length
    ? opts.cmdOverride.map((a) => a
        .replace('/workspace/script.py', scriptHostPath)
        .replace('/workspace/script.js', scriptHostPath)
        .replace('/workspace', scratch))
    : (language === 'python'
      ? ['python3', scriptHostPath]
      : ['node', scriptHostPath]);

  const child = spawn(baseCmd[0], baseCmd.slice(1), {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: scratch,
    env: { ...process.env, HOME: scratch },
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
  stderr = `[sandbox] WARNING: no sandbox active (dev mode)\n${stderr}`;
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

module.exports = { name: 'none', run };
