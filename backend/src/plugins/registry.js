const fs = require('fs');
const path = require('path');

class PluginRegistry {
  constructor(){
    this.handlers = new Map(); // key -> async (node,msg,inputs)
    this.meta = new Map();     // key -> { source, mtime }
    this.baseDirs = [ path.resolve(__dirname, 'local'), path.resolve(__dirname, 'repos') ];
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

  addBaseDir(dir){ this.baseDirs.push(path.resolve(dir)); }

  loadFromDir(dir){
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
          try { const { importManifest } = require('./importer'); importManifest(manifest).catch(()=>{}); } catch {}
        } catch {}
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
    return loaded;
  }

  reload(){
    this.handlers.clear(); this.meta.clear();
    let total = [];
    for (const d of this.baseDirs) total = total.concat(this.loadFromDir(d));
    return total;
  }
}

const registry = new PluginRegistry();
registry.reload();

module.exports = { registry, PluginRegistry };
