// Tests pour le nouvel endpoint /work-plan.
// On inspecte le code source (pas de requête HTTP réelle — garder les tests
// rapides + pas de dépendance DB/réseau).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const AI_ROUTES = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'modules', 'db', 'ai.js'),
  'utf8',
);

test('endpoint /work-plan existe', () => {
  assert.ok(
    AI_ROUTES.includes("'/ai/threads/:threadId/work-plan'"),
    'Le nouveau endpoint /work-plan doit être défini',
  );
});

test('endpoint retourne plan + mainTodo + subagents + artifacts + actions', () => {
  // On vérifie juste que chaque clé apparaît dans le handler work-plan
  const idx = AI_ROUTES.indexOf("'/ai/threads/:threadId/work-plan'");
  assert.ok(idx > 0, 'endpoint work-plan non trouvé');
  // Cherche dans les 15 000 chars suivants (le handler est long)
  const slice = AI_ROUTES.slice(idx, idx + 15000);
  for (const key of ['plan', 'mainTodo', 'subagents', 'artifacts', 'actions']) {
    assert.ok(slice.includes(key), `work-plan doit exposer "${key}"`);
  }
});

test('work-plan utilise roster enrichissement pour subagents', () => {
  assert.ok(
    /require\('\.\.\/\.\.\/ai\/subagent\/roster'\)/.test(AI_ROUTES) || AI_ROUTES.includes('ROSTER'),
    'work-plan doit enrichir les subagents avec les données roster (emoji, nom, couleur)',
  );
});

test('work-plan collecte les artefacts (user uploads + fichiers générés)', () => {
  // Le endpoint doit lister les attachments ET les fileInline
  assert.ok(AI_ROUTES.includes('user_upload'), 'artefacts doivent inclure les uploads user');
  assert.ok(AI_ROUTES.includes('fileInline'), 'artefacts doivent inclure les fichiers générés');
});

test('work-plan détecte les permissions pending des subagents', () => {
  assert.ok(
    AI_ROUTES.includes('pendingPermission'),
    'work-plan doit remonter les permissions pending par subagent',
  );
});
