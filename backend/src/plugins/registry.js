const fs = require('fs');
const path = require('path');

class PluginRegistry {
  constructor(){
    this.handlers = new Map(); // key -> async (node,msg,inputs)
    this.meta = new Map();     // key -> { source, mtime }
    this.baseDirs = [ path.resolve(__dirname, 'local') ];
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
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
    for (const f of files){
      const full = path.join(dir, f);
      try {
        delete require.cache[require.resolve(full)];
        const mod = require(full);
        const exports = mod && (mod.default || mod) || {};
        const key = exports.key || path.basename(f, '.js');
        const fn = exports.run || exports.handler || exports.execute || exports;
        if (this.register(key, fn, full)) loaded.push(key);
      } catch (e) {
        // skip broken plugin
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

