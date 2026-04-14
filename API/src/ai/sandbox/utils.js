// Utilitaires partagés pour les backends de sandbox (bwrap, subprocess, none).
// Fournit : which(), canUseUserNamespaces(), listProducedFiles(), coerceOutput().

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Recherche un binaire dans le PATH. Retourne le chemin absolu ou null.
 * @param {string} binary
 * @returns {string|null}
 */
function which(binary) {
  if (!binary || typeof binary !== 'string') return null;
  const pathEnv = process.env.PATH || '';
  const separator = process.platform === 'win32' ? ';' : ':';
  const exts = process.platform === 'win32'
    ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')
    : [''];
  for (const dir of pathEnv.split(separator)) {
    if (!dir) continue;
    for (const ext of exts) {
      const full = path.join(dir, binary + ext);
      try {
        const st = fs.statSync(full);
        if (st.isFile()) return full;
      } catch { /* suivant */ }
    }
  }
  return null;
}

/**
 * Détecte si l'hôte permet les user namespaces non privilégiés (requis par bwrap).
 * Essaye d'abord la lecture du flag kernel, puis fallback via `bwrap --unshare-user-try true`.
 * @returns {Promise<boolean>}
 */
async function canUseUserNamespaces() {
  // Chemin le plus fiable sur noyau Linux récent
  try {
    const raw = await fsp.readFile('/proc/sys/kernel/unprivileged_userns_clone', 'utf8');
    const val = parseInt(raw.trim(), 10);
    if (!Number.isNaN(val)) return val === 1;
  } catch { /* fichier absent sur certains noyaux → on teste via bwrap */ }

  // Fallback : on tente un bwrap vide — s'il sort avec 0, userns est utilisable.
  const bwrap = which('bwrap');
  if (!bwrap) return false;

  return new Promise((resolve) => {
    let settled = false;
    const child = spawn(bwrap, ['--unshare-user-try', '--die-with-parent', 'true'], {
      stdio: 'ignore',
    });
    const finalize = (ok) => {
      if (settled) return;
      settled = true;
      resolve(!!ok);
    };
    child.on('error', () => finalize(false));
    child.on('exit', (code) => finalize(code === 0));
    // Garde fou : ne jamais bloquer
    setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
      finalize(false);
    }, 2000).unref?.();
  });
}

/**
 * Parcourt récursivement un répertoire et retourne la liste des fichiers produits.
 * @param {string} scratchDir - racine du scratch
 * @param {string[]} excludes - chemins absolus à ignorer (ex: script source, dir d'entrée)
 * @returns {Promise<Array<{path: string, size: number}>>}
 */
async function listProducedFiles(scratchDir, excludes = []) {
  const excludeSet = new Set((excludes || []).map((p) => path.resolve(p)));
  const results = [];

  async function walk(dir) {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (excludeSet.has(path.resolve(full))) continue;
      // Si un des ancêtres est exclu, on saute aussi
      let skip = false;
      for (const ex of excludeSet) {
        if (full === ex || full.startsWith(ex + path.sep)) { skip = true; break; }
      }
      if (skip) continue;

      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        try {
          const st = await fsp.stat(full);
          results.push({ path: full, size: st.size });
        } catch { /* fichier supprimé entre-temps */ }
      }
    }
  }

  await walk(scratchDir);
  return results;
}

/**
 * Capture un flux stdout/stderr en le cappant à maxBytes.
 * Retourne un objet { getBuffer(), truncated } + attache un listener au flux donné.
 * @param {NodeJS.ReadableStream} stream
 * @param {number} maxBytes
 */
function coerceOutput(stream, maxBytes) {
  const cap = Math.max(0, maxBytes | 0);
  const chunks = [];
  let total = 0;
  let truncated = false;

  stream.on('data', (chunk) => {
    if (truncated) return;
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    if (total + buf.length > cap) {
      const remaining = Math.max(0, cap - total);
      if (remaining > 0) chunks.push(buf.subarray(0, remaining));
      total = cap;
      truncated = true;
    } else {
      chunks.push(buf);
      total += buf.length;
    }
  });

  return {
    getBuffer() { return Buffer.concat(chunks, total); },
    getString() { return Buffer.concat(chunks, total).toString('utf8'); },
    get truncated() { return truncated; },
    get bytes() { return total; },
  };
}

module.exports = {
  which,
  canUseUserNamespaces,
  listProducedFiles,
  coerceOutput,
};
