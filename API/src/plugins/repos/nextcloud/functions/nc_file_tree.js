const { utils } = require("./utils");

// Parcours RÉCURSIF BORNÉ de l'arborescence Nextcloud (WebDAV).
//
// `nc_file_list` ne fait qu'un PROPFIND Depth 1 (un seul niveau). Ici on descend en
// profondeur à partir d'un dossier racine, SANS surcharger : double garde-fou
// `maxDepth` (profondeur) + `maxItems` (budget total d'éléments). On marque chaque
// élément `isFolder` + `parentPath` pour que le Radar reconstruise la hiérarchie
// (dossier part_of dossier parent, fichier part_of son dossier).
//
// Entrées : { path?='/', maxDepth?=3, maxItems?=800, includeFiles?=true }
module.exports = {
  async nc_file_tree(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const root = d.path || "/";
    const maxDepth = Math.max(1, Math.min(8, Number(d.maxDepth) || 3));
    const maxItems = Math.max(1, Math.min(5000, Number(d.maxItems) || 800));
    const includeFiles = d.includeFiles !== false;

    const out = [];
    const seen = new Set();
    // Les hrefs WebDAV sont absolus (/remote.php/dav/files/{user}/…). On les rend
    // RELATIFS à la racine de l'utilisateur car webdavRequest re-préfixe lui-même.
    const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };   // tolère un % littéral
    const rel = (p) => dec(p || "").replace(/^.*\/remote\.php\/dav\/files\/[^/]+/, "") || "/";
    const norm = (p) => rel(p).replace(/\/+$/, "") || "/";             // relatif, sans slash final
    const parentOf = (p) => { const s = norm(p); const i = s.lastIndexOf("/"); return i <= 0 ? "/" : s.slice(0, i); };

    // File d'attente BFS : on traite dossier par dossier, on s'arrête au budget.
    const queue = [{ path: root, depth: 0 }];
    let truncated = false;
    while (queue.length) {
      if (out.length >= maxItems) { truncated = true; break; }
      const { path, depth } = queue.shift();
      const res = await utils.webdavRequest(opts, path, {
        method: "PROPFIND",
        headers: { "Depth": "1", "Content-Type": "application/xml" },
      });
      if (!res.ok) { log(`PROPFIND échec ${path}: ${res.error}`); continue; }
      const items = utils.parseWebdavMultistatus(res.data);
      for (const it of items) {
        const ip = norm(it.path);
        if (ip === norm(path) || seen.has(ip)) continue;               // le dossier lui-même / doublon
        seen.add(ip);
        const isFolder = !it.contentType || /\/$/.test(it.path);
        if (!isFolder && !includeFiles) continue;
        if (out.length >= maxItems) { truncated = true; break; }
        out.push({ ...it, path: ip, isFolder, parentPath: parentOf(ip), depth });
        if (isFolder && depth + 1 < maxDepth) queue.push({ path: ip, depth: depth + 1 });
      }
    }
    log(`${out.length} éléments (profondeur ${maxDepth}, budget ${maxItems}${truncated ? ", TRONQUÉ" : ""})`);
    return { ok: true, totalCount: out.length, truncated, files: out };
  },
};
