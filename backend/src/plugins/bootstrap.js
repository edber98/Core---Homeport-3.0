const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const PluginRepo = require('../db/models/plugin-repo.model');
const { registry } = require('./registry');

function parseReposEnv(raw) {
  if (!raw) return [];
  try {
    const t = String(raw).trim();
    if (!t) return [];
    if (t.startsWith('[')) {
      const arr = JSON.parse(t);
      return Array.isArray(arr) ? arr : [];
    }
    // CSV format: url[#branch];url2[#branch2]
    return t.split(',').map(s => s.trim()).filter(Boolean).map(s => {
      const [url, branch] = s.split('#');
      return { url, branch };
    });
  } catch { return []; }
}

function repoDirNameFromUrl(url){
  try {
    const base = url.split('/').pop() || 'repo';
    return base.replace(/\.git$/,'');
  } catch { return 'repo'; }
}

function git(cmd, args, opts){
  try { execFileSync(cmd, args, { stdio: 'inherit', ...opts }); return true; } catch (e) { try { console.error('[plugins] git failed:', e.message); } catch {} return false; }
}

async function ensureReposFromEnv(){
  const raw = process.env.PLUGIN_REPOS || '';
  const items = parseReposEnv(raw);
  try { console.log('[plugins] bootstrap: env repos =', items.length); } catch {}
  const baseDir = path.resolve(__dirname, 'repos');
  try { if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true }); } catch {}

  for (const it of items){
    const url = String(it.url || '').trim(); if (!url) continue;
    const branch = String(it.branch || 'main').trim();
    const name = String(it.name || repoDirNameFromUrl(url));
    const dest = path.join(baseDir, name);
    try {
      if (!fs.existsSync(dest)) {
        console.log(`[plugins] cloning ${url} into ${dest} (branch ${branch})`);
        // clone --depth 1 --branch branch url dest
        git('git', ['clone', '--depth', '1', '--branch', branch, url, dest]);
      } else {
        console.log(`[plugins] updating ${dest}`);
        git('git', ['-C', dest, 'fetch', '--all']);
        git('git', ['-C', dest, 'reset', '--hard', `origin/${branch}`]);
        git('git', ['-C', dest, 'checkout', branch]);
        git('git', ['-C', dest, 'pull', 'origin', branch]);
      }
    } catch {}

    // Ensure PluginRepo doc and attach to registry
    try {
      let repo = await PluginRepo.findOne({ type: 'git', url }).lean();
      if (!repo) {
        repo = await PluginRepo.create({ name, type: 'git', url, branch, path: dest, companyId: null, enabled: true, status: 'synced', lastSyncAt: new Date() });
        repo = repo.toObject();
      }
      registry.addBaseDir(dest, { id: (repo._id || repo.id), name: repo.name, companyId: repo.companyId || null });
    } catch (e) { try { console.error('[plugins] failed to persist repo', e.message); } catch {} }
  }

  // Load all repos (builtin + env repos)
  try { const loaded = registry.reload(); console.log('[plugins] registry reloaded, handlers =', loaded.length); } catch (e) { try { console.error('[plugins] reload failed:', e.message); } catch {} }
}

module.exports = { ensureReposFromEnv };
