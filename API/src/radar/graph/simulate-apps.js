// Génère des données SIMULÉES Nextcloud (arborescence /Clients/<nom>/…) et
// OpenProject (projets + tâches), nommées d'après de vrais tiers, pour tester la
// corrélation cross-logiciel sans credentials. Le Radar doit DÉTECTER seul que ces
// dossiers/projets concernent le client (via radar/graph/correlate.js).

function slug(s) { return String(s || '').replace(/[^A-Za-z0-9À-ÿ ]/g, '').trim(); }

/** Noms de clients exploitables et uniques (slug >= 3 car., dédupliqués). Pure. */
function usableNames(names) {
  const seen = new Set(), out = [];
  for (const n of names || []) {
    const s = slug(n);
    if (s.length < 3) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key); out.push(n);
  }
  return out;
}

/** Arborescence Nextcloud : un dossier client + sous-dossiers + quelques fichiers. */
function generateNextcloud({ clientNames = [], now = new Date() } = {}) {
  const folders = [], files = [];
  const mt = Math.floor(now.getTime() / 1000);
  folders.push({ path: '/Clients', name: 'Clients', type: 'dir', mtime: mt });
  usableNames(clientNames).slice(0, 6).forEach((name, k) => {
    const base = `/Clients/${slug(name)}`;
    folders.push({ path: base, name: slug(name), type: 'dir', mtime: mt - k * 86400 });
    for (const sub of ['Devis', 'Factures', 'Contrats']) {
      folders.push({ path: `${base}/${sub}`, name: sub, type: 'dir', mtime: mt - k * 86400 });
    }
    files.push({ path: `${base}/Contrats/Contrat ${slug(name)} 2026.pdf`, name: `Contrat ${slug(name)} 2026.pdf`, type: 'file', contentType: 'application/pdf', size: 184320, mtime: mt - k * 86400 });
    files.push({ path: `${base}/Devis/Devis ${slug(name)}.pdf`, name: `Devis ${slug(name)}.pdf`, type: 'file', contentType: 'application/pdf', size: 92160, mtime: mt - k * 43200 });
  });
  return { folders, files };
}

/** Projets OpenProject nommés d'après les clients + une tâche chacun. */
function generateOpenProject({ clientNames = [], now = new Date() } = {}) {
  const projects = [], workPackages = [];
  const iso = now.toISOString();
  usableNames(clientNames).slice(0, 6).forEach((name, k) => {
    const id = `op_${k + 1}`;
    projects.push({ id, name: `Projet ${slug(name)}`, status: 'on_track', createdAt: iso });
    workPackages.push({ id: `wp_${k + 1}`, subject: `Cadrage ${slug(name)}`, status: '7', projectId: id });
    workPackages.push({ id: `wp_${k + 1}b`, subject: `Livraison ${slug(name)}`, status: '1', projectId: id });
  });
  return { projects, workPackages };
}

module.exports = { generateNextcloud, generateOpenProject };
