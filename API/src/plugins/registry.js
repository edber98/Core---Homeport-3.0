const fs = require('fs');
const path = require('path');

class PluginRegistry {
  constructor(){
    this.handlers = new Map(); // key -> async (node,msg,inputs)
    this.meta = new Map();     // key -> { source, mtime }
    // Track baseDirs with optional repo metadata for import attribution
    this.baseDirs = [ { path: path.resolve(__dirname, 'local'), repo: null }, { path: path.resolve(__dirname, 'repos'), repo: null } ];
  }

  normalizeKey(k){
    if (!k) return '';
    let s = String(k).trim().toLowerCase();
    s = s.replace(/^tmpl_/,'').replace(/^template_/,'').replace(/^fn_/,'').replace(/^node_/,'');
    return s.replace(/[^a-z0-9_]/g,'_');
  }

  register(key, fn, source='programmatic'){
    const k = this.normalizeKey(key);
    if (!k || typeof fn !== 'function') return false;
    this.handlers.set(k, fn);
    this.meta.set(k, { source, mtime: Date.now() });
    return true;
  }

  resolve(key){ return this.handlers.get(this.normalizeKey(key)); }

  list(){ return [...this.handlers.keys()].map(k => ({ key: k, ...this.meta.get(k) })); }

  addBaseDir(dir, repo = null){ this.baseDirs.push({ path: path.resolve(dir), repo: repo || null }); }

  loadFromDir(dir, repo){
    const loaded = [];
    if (!fs.existsSync(dir)) return loaded;
    // Each subdir is a plugin repo with manifest.json and functions/*.js
    const entries = fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const ent of entries){
      const plugDir = path.join(dir, ent.name);
      const manifestPath = path.join(plugDir, 'manifest.json');
      if (fs.existsSync(manifestPath)){
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          // Import providers/nodeTemplates into DB
          try {
            const { importManifest } = require('./importer');
            importManifest(manifest, { repo })
              .then((summary) => logImportSuccess(repo, manifestPath, summary))
              .catch((e)=>logImportError(repo, manifestPath, e));
          } catch (e) { logImportError(repo, manifestPath, e); }
        } catch (e) { logImportError(repo, manifestPath, e); }
      }
      const fnDir = path.join(plugDir, 'functions');
      if (fs.existsSync(fnDir)){
        const files = fs.readdirSync(fnDir).filter(f => f.endsWith('.js'));
        for (const f of files){
          const full = path.join(fnDir, f);
          try {
            delete require.cache[require.resolve(full)];
            const mod = require(full);
            const exp = (mod && (mod.default || mod)) || mod || {};
            // Support several formats:
            // 1) Single: { key, run }
            if (exp && typeof exp === 'object' && typeof exp.run === 'function' && typeof exp.key === 'string'){
              const key = exp.key; const fn = exp.run; if (this.register(key, fn, full)) loaded.push(key); continue;
            }
            // 2) Handlers map: { handlers: { key: fn, ... } }
            if (exp && typeof exp.handlers === 'object'){
              for (const [k, fn] of Object.entries(exp.handlers)) if (typeof fn === 'function') { if (this.register(k, fn, full)) loaded.push(k); }
              continue;
            }
            // 3) Plain object of functions: { http(){}, sendmail(){} }
            if (exp && typeof exp === 'object'){
              for (const [k, fn] of Object.entries(exp)) if (typeof fn === 'function') { if (this.register(k, fn, full)) loaded.push(k); }
              continue;
            }
          } catch {}
        }
      }
    }
    if (loaded.length) {
      try { console.log('[plugins] handlers loaded from', dir, '→', loaded.length); } catch {}
    }
    return loaded;
  }

  reload(){
    this.handlers.clear(); this.meta.clear();
    let total = [];
    for (const entry of this.baseDirs) total = total.concat(this.loadFromDir(entry.path, entry.repo || null));
    return total;
  }
}

const registry = new PluginRegistry();
// Do not auto-reload on module load to avoid side effects (e.g., CLI purge)
module.exports = { registry, PluginRegistry };

function logImportError(repo, manifestPath, e){
  try { console.error('[plugins] import failed', manifestPath, e && e.message ? e.message : e); } catch {}
  try {
    const Notification = require('../db/models/notification.model');
    const companyId = repo && repo.companyId ? repo.companyId : null;
    const entityId = repo && repo.id ? String(repo.id) : null;
    Notification.create({ companyId, workspaceId: null, entityType: 'plugin_repo', entityId, severity: 'error', code: 'plugin_import_error', message: `Import failed for ${manifestPath}`, details: { error: String(e && e.message || e) } }).catch(()=>{});
  } catch {}
}

function logImportSuccess(repo, manifestPath, summary){
  try {
    const p = summary && summary.providers || {};
    const t = summary && summary.nodeTemplates || {};
    console.log('[plugins] import ok', manifestPath, `providers(c/u/s): ${p.created||0}/${p.updated||0}/${p.skipped||0}`, `templates(c/u/s): ${t.created||0}/${t.updated||0}/${t.skipped||0}`);
  } catch {}
}
