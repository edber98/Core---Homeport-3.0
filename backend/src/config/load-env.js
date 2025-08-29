const fs = require('fs');
const path = require('path');

function resolveEnvPath() {
  const candidates = [
    // backend/.env
    path.resolve(__dirname, '../../.env'),
    // legacy: backend/src/.env
    path.resolve(__dirname, '../.env'),
    // process cwd
    path.resolve(process.cwd(), '.env')
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  return null;
}

function loadEnvOnce(envPath) {
  try {
    const key = '__HP_ENV_LOADED__';
    if (global[key]) return; // idempotent across imports
    const p = envPath || resolveEnvPath();
    if (!p) { global[key] = true; return; }
    const raw = fs.readFileSync(p, 'utf8');
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const k = trimmed.slice(0, eq).trim();
      let v = trimmed.slice(eq + 1).trim();
      // strip optional quotes
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[k] == null) process.env[k] = v;
    }
    global[key] = true;
    try {
      const hasOpenAI = !!(process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_APIKEY);
      console.log('[env] loaded .env OPENAI_KEY:', hasOpenAI ? 'present' : 'absent');
    } catch {}
  } catch {}
}

module.exports = { loadEnvOnce };
