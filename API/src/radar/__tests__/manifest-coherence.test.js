// Cohérence des blocs radar des manifests pilotes : chaque bloc est valide et
// chaque capacité pointe vers un template qui existe dans le manifest.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { validateRadarBlocks, normalizeRadarBlocks, FAMILIES } = require('../families');

const REPOS_DIR = path.resolve(__dirname, '../../plugins/repos');
const PILOTS = ['odoo', 'gmail', 'nextcloud'];

function loadManifest(repo) {
  return JSON.parse(fs.readFileSync(path.join(REPOS_DIR, repo, 'manifest.json'), 'utf8'));
}

for (const repo of PILOTS) {
  test(`manifest ${repo} : blocs radar valides contre ses templates`, () => {
    const m = loadManifest(repo);
    const templateKeys = (m.nodeTemplates || []).map(t => t.key);
    const radarProviders = (m.providers || []).filter(p => p.radar);
    assert.ok(radarProviders.length > 0, `${repo}: aucun provider avec bloc radar`);
    for (const p of radarProviders) {
      const v = validateRadarBlocks(p.radar, { templateKeys });
      assert.ok(v.ok, `${repo}/${p.key}: ${v.errors.join(' | ')}`);
    }
  });
}

test('les manifests pilotes couvrent les familles attendues de la phase 1', () => {
  const families = new Set();
  for (const repo of PILOTS) {
    for (const p of loadManifest(repo).providers || []) {
      for (const b of normalizeRadarBlocks(p.radar)) families.add(b.family);
    }
  }
  for (const expected of ['accounting', 'crm', 'email', 'storage']) {
    assert.ok(families.has(expected), `famille pilote manquante: ${expected}`);
  }
});

test('chaque bloc radar pilote mappe la testCapability de sa famille', () => {
  for (const repo of PILOTS) {
    for (const p of loadManifest(repo).providers || []) {
      for (const b of normalizeRadarBlocks(p.radar)) {
        const tc = FAMILIES[b.family].testCapability;
        assert.ok(b.capabilities[tc], `${repo}/${p.key} (${b.family}): testCapability '${tc}' non mappée — le test de connexion du wizard échouerait`);
      }
    }
  }
});

// ── Couverture globale : TOUS les repos avec bloc radar sont valides ──

function allRadarRepos() {
  return fs.readdirSync(REPOS_DIR).filter(dir => {
    const p = path.join(REPOS_DIR, dir, 'manifest.json');
    if (!fs.existsSync(p)) return false;
    try { return (JSON.parse(fs.readFileSync(p, 'utf8')).providers || []).some(x => x.radar); }
    catch { return false; }
  });
}

test('tous les repos équipés : blocs radar valides contre leurs templates', () => {
  const repos = allRadarRepos();
  assert.ok(repos.length >= 25, `couverture insuffisante : ${repos.length} repos équipés (attendu ≥ 25)`);
  for (const repo of repos) {
    const m = loadManifest(repo);
    const templateKeys = (m.nodeTemplates || []).map(t => t.key);
    for (const p of (m.providers || []).filter(x => x.radar)) {
      const v = validateRadarBlocks(p.radar, { templateKeys });
      assert.ok(v.ok, `${repo}/${p.key}: ${v.errors.join(' | ')}`);
    }
  }
});

test('tous les repos équipés : chaque famille est couverte par au moins 2 providers', () => {
  const byFamily = new Map();
  for (const repo of allRadarRepos()) {
    for (const p of (loadManifest(repo).providers || []).filter(x => x.radar)) {
      for (const b of normalizeRadarBlocks(p.radar)) {
        byFamily.set(b.family, (byFamily.get(b.family) || 0) + 1);
      }
    }
  }
  for (const fam of ['storage', 'email', 'accounting', 'crm', 'productivity', 'calendar', 'communication', 'support']) {
    assert.ok((byFamily.get(fam) || 0) >= 2, `famille '${fam}' : ${byFamily.get(fam) || 0} provider(s) — couverture trop faible`);
  }
});
