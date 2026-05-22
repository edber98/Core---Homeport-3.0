const fs = require('fs');
const path = require('path');

class PluginRegistry {
  constructor(){
    this.handlers = new Map(); // key -> async (node,msg,inputs)
    this.meta = new Map();     // key -> { source, mtime }
    // Track baseDirs with optional repo metadata for import attribution
    // Default: include both local and repos
    this.baseDirs = [
      { path: path.resolve(__dirname, 'local'), repo: null },
      { path: path.resolve(__dirname, 'repos'), repo: null }
    ];
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

  async loadFromDir(dir, repo){
    const loaded = [];
    // Collect import promises and manifest keys for cleanup
    const importJobs = [];
    if (!fs.existsSync(dir)) return { loaded, importJobs };
    // Each subdir is a plugin repo with manifest.json and functions/*.js
    const entries = fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const ent of entries){
      const plugDir = path.join(dir, ent.name);
      const manifestPath = path.join(plugDir, 'manifest.json');
      const allowImport = process.env.PLUGIN_IMPORT_ENABLED === '1';
      if (fs.existsSync(manifestPath) && allowImport){
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          // Determine/ensure a PluginRepo doc for this folder (builtin repo)
          let repoMeta = repo || null;
          try {
            const PluginRepo = require('../db/models/plugin-repo.model');
            const name = (manifest.repo && manifest.repo.name) || ent.name;
            const type = (manifest.repo && manifest.repo.type) || 'local';
            const url = (manifest.repo && manifest.repo.url) || undefined;
            const branch = (manifest.repo && manifest.repo.branch) || undefined;
            let pr = await PluginRepo.findOne({ name, path: plugDir, type, companyId: null });
            if (!pr) pr = await PluginRepo.create({ name, type, path: plugDir, url, branch, companyId: null, enabled: true, status: 'builtin' });
            const obj = pr.toObject();
            repoMeta = { id: obj._id || obj.id, name: obj.name, companyId: obj.companyId || null };
          } catch {}
          // Import providers/nodeTemplates into DB with repo metadata and manifest path
          try {
            const { importManifest } = require('./importer');
            const importPromise = importManifest(manifest, { repo: repoMeta, manifestPath })
              .then((summary) => {
                logImportSuccess(repoMeta, manifestPath, summary);
                return { repoMeta, summary };
              })
              .catch((e) => { logImportError(repoMeta, manifestPath, e); return null; });
            importJobs.push(importPromise);
          } catch (e) { logImportError(repoMeta, manifestPath, e); }
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
          } catch (loadErr) { try { console.error('[plugins] handler load error', full, loadErr && loadErr.message ? loadErr.message : loadErr); } catch {} }
        }
      }
    }
    if (loaded.length) {
      try { console.log('[plugins] handlers loaded from', dir, '→', loaded.length); } catch {}
    }
    return { loaded, importJobs };
  }

  async reload(){
    this.handlers.clear(); this.meta.clear();
    let total = [];
    let allImportJobs = [];
    for (const entry of this.baseDirs){
      const { loaded, importJobs } = await this.loadFromDir(entry.path, entry.repo || null);
      total = total.concat(loaded);
      allImportJobs = allImportJobs.concat(importJobs || []);
    }

    // Cleanup stale entries if enabled (separate env var to avoid overhead)
    if (process.env.PLUGIN_CLEANUP_ENABLED === '1'){
      try {
        // Wait for all imports to complete first
        const results = await Promise.all(allImportJobs);
        // Aggregate keys per repo
        const repoMap = new Map(); // repoId -> { providerKeys: Set, templateKeys: Set }
        for (const r of results){
          if (!r || !r.repoMeta || !r.repoMeta.id) continue;
          const rid = String(r.repoMeta.id);
          if (!repoMap.has(rid)) repoMap.set(rid, { providerKeys: new Set(), templateKeys: new Set() });
          const entry = repoMap.get(rid);
          for (const k of (r.summary.providerKeys || [])) entry.providerKeys.add(k);
          for (const k of (r.summary.templateKeys || [])) entry.templateKeys.add(k);
        }
        // Run cleanup for each repo
        const { cleanupStale } = require('./importer');
        for (const [repoId, keys] of repoMap.entries()){
          try {
            const cr = await cleanupStale(repoId, keys.providerKeys, keys.templateKeys);
            if (cr.templatesRemoved || cr.providersRemoved){
              console.log(`[plugins] cleanup for repo ${repoId}: ${cr.templatesRemoved} template(s), ${cr.providersRemoved} provider(s) removed`);
            }
          } catch (e) { console.error('[plugins] cleanup error for repo', repoId, e && e.message || e); }
        }

        // Also cleanup repos known in DB but not imported during this reload
        // (e.g. branch removed a provider folder/manifest).
        try {
          const PluginRepo = require('../db/models/plugin-repo.model');
          const importedRepoIds = new Set([...repoMap.keys()]);
          const isUnderBaseDirs = (p) => {
            try {
              if (!p) return false;
              const abs = path.resolve(String(p));
              return this.baseDirs.some((b) => {
                const base = path.resolve(String(b.path));
                return abs === base || abs.startsWith(base + path.sep);
              });
            } catch { return false; }
          };
          const knownRepos = await PluginRepo.find({ enabled: true }, { _id: 1, path: 1, type: 1 }).lean();
          for (const repo of knownRepos){
            const repoId = String(repo._id);
            if (importedRepoIds.has(repoId)) continue;
            if (repo.type === 'local' && !isUnderBaseDirs(repo.path)) continue;
            const manifestPath = path.join(String(repo.path || ''), 'manifest.json');
            if (repo.path && fs.existsSync(manifestPath)) continue;
            try {
              const cr = await cleanupStale(repoId, new Set(), new Set());
              if (cr.templatesRemoved || cr.providersRemoved){
                console.log(`[plugins] cleanup missing repo ${repoId}: ${cr.templatesRemoved} template(s), ${cr.providersRemoved} provider(s) removed`);
              }
            } catch (e) {
              console.error('[plugins] cleanup missing repo error for repo', repoId, e && e.message || e);
            }
          }
        } catch (e) {
          console.error('[plugins] cleanup missing-repo phase error:', e && e.message || e);
        }
      } catch (e) { console.error('[plugins] cleanup phase error:', e && e.message || e); }
    }

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
    Notification.create({ companyId, workspaceId: null, entityType: 'plugin_repo', entityId, severity: 'error', code: 'plugin_import_error', message: `Échec de l'import pour ${manifestPath}`, details: { error: String(e && e.message || e) } }).catch(()=>{});
  } catch {}
}

function logImportSuccess(repo, manifestPath, summary){
  try {
    const p = summary && summary.providers || {};
    const t = summary && summary.nodeTemplates || {};
    console.log('[plugins] import ok', manifestPath, `providers(c/u/s): ${p.created||0}/${p.updated||0}/${p.skipped||0}`, `templates(c/u/s): ${t.created||0}/${t.updated||0}/${t.skipped||0}`);
    // Persist import history if available
    if (summary && Array.isArray(summary.history) && summary.history.length){
      try {
        const PluginImportHistory = require('../db/models/plugin-import-history.model');
        const bulk = summary.history.map(h => ({ insertOne: { document: h } }));
        if (bulk.length) PluginImportHistory.bulkWrite(bulk).catch(()=>{});
      } catch {}
    }
  } catch {}
}
