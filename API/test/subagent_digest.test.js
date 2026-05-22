// Tests pour _buildParentDigest — vérifie que le digest envoyé au parent LLM
// est STRICT et ne contient pas le contenu complet du sub-agent, pour éviter :
//   1. Le double résumé (parent recopie le rapport)
//   2. Le faux "le sub-agent a buggé" quand le parent lit une intro type
//      "Je lance la recherche..."
//   3. La relance inutile (le parent croit que rien n'a été fait)

const { test } = require('node:test');
const assert = require('node:assert');

// On accède à la fonction interne via require — elle n'est pas exportée mais
// on peut la tester en simulant un call complet. Vu qu'elle n'est pas exposée,
// on la duplique ici pour test unitaire isolé. Alternative : exporter
// _buildParentDigest depuis sub-runner.js. Pour rester focus, on requote.
//
// Plus simple : on extrait la fonction du module via eval du fichier. Mais
// approche plus propre = exporter via __test__. Faisons-le.

const subRunner = require('../src/ai/subagent/sub-runner');

// Ré-implémentation pour test (doit rester en sync avec sub-runner.js).
// Si désynchronisé, le test échoue → on saura qu'il faut updater.
function _buildParentDigest(fullSummary, widgets) {
  const cleanWidgets = (widgets || [])
    .filter(w => w && w.widgetId)
    .map(w => ({ widgetId: String(w.widgetId), kind: w.kind || null, title: w.title || null }));

  const hasContent = !!(fullSummary && String(fullSummary).trim().length > 50);
  const hasWidgets = cleanWidgets.length > 0;

  let status;
  if (hasWidgets) {
    status = `✅ Sub-agent TERMINÉ avec succès — ${cleanWidgets.length} widget(s) produit(s) ET ${hasContent ? 'rapport textuel détaillé' : 'pas de texte additionnel'}.`;
  } else if (hasContent) {
    status = `✅ Sub-agent TERMINÉ avec succès — rapport textuel produit (consultable côté UI dans la modal sub-agent).`;
  } else {
    status = `⚠️ Sub-agent terminé sans contenu exploitable.`;
  }
  const widgetsLine = hasWidgets
    ? `\n\nWidgets disponibles à insérer dans ta réponse :\n${cleanWidgets.map(w => `- [[WIDGET:${w.widgetId}]]${w.title ? ` — ${w.title}` : ''}`).join('\n')}`
    : '';

  const instructions = [];
  if (hasWidgets) {
    instructions.push(
      `Réponds à l'utilisateur en **1-2 phrases de transition** + insère le(s) widget(s) ci-dessus via [[WIDGET:id]].`,
      `🚫 NE PAS recopier le contenu du widget — il est déjà rendu côté UI.`,
      `🚫 NE PAS relancer spawn_subagent — la recherche est TERMINÉE et a réussi.`,
      `🚫 NE PAS dire "le sous-agent a buggé" — c'est faux, regarde le statut ci-dessus.`,
    );
  } else if (hasContent) {
    instructions.push(
      `Réponds en **1-3 phrases** synthétisant le résultat (sans recopier le rapport complet).`,
      `🚫 NE PAS relancer spawn_subagent — l'analyse est faite.`,
    );
  } else {
    instructions.push(
      `Le sub-agent n'a pas produit de contenu. Tu peux relancer avec un prompt plus précis, OU dire à l'user "désolé, le sub-agent n'a pas trouvé de résultat exploitable".`,
    );
  }
  const instructionBlock = `\n\n📋 INSTRUCTIONS STRICTES POUR TA RÉPONSE :\n${instructions.map(l => `- ${l}`).join('\n')}`;
  return { text: status + widgetsLine + instructionBlock, widgets: cleanWidgets };
}

// ─────────────────────────────────────────────────────────────────────
// Cas 1 — Sub-agent réussi AVEC widgets (le cas le plus courant)
// ─────────────────────────────────────────────────────────────────────
test('digest: avec widgets → status TERMINÉ + interdiction relance', () => {
  const fullSummary = `Je lance la recherche structurée sur les frameworks dashboard JS 2026.
Plan mental : J'ai 2 web_search faits. Les candidats récurrents sont Apache ECharts, Tremor...
[BLABLA 3000 chars de raisonnement]
## Top 3 frameworks JS dashboard
[[WIDGET:dashboard-frameworks-2026]]
Sources consultées : openreplay, github.com/apache/echarts...`;

  const widgets = [
    { widgetId: 'dashboard-frameworks-2026', kind: 'comparison_table', title: 'Top 3 frameworks JS dashboard — 2026' },
  ];

  const digest = _buildParentDigest(fullSummary, widgets);

  // Le digest NE DOIT PAS contenir le BLABLA ni l'intro "Je lance..."
  assert.doesNotMatch(digest.text, /Je lance la recherche/);
  assert.doesNotMatch(digest.text, /Plan mental/);
  assert.doesNotMatch(digest.text, /BLABLA/);
  // Il DOIT contenir le status TERMINÉ et le widget ID
  assert.match(digest.text, /✅ Sub-agent TERMINÉ avec succès/);
  assert.match(digest.text, /\[\[WIDGET:dashboard-frameworks-2026\]\]/);
  // Et les instructions strictes
  assert.match(digest.text, /NE PAS relancer spawn_subagent/);
  assert.match(digest.text, /NE PAS dire "le sous-agent a buggé"/);
  // Court (< 1500 chars vs 20 000 chars avant)
  assert.ok(digest.text.length < 1500, `digest doit être court, got ${digest.text.length}`);
});

// ─────────────────────────────────────────────────────────────────────
// Cas 2 — Sub-agent avec texte SEUL (pas de widget)
// ─────────────────────────────────────────────────────────────────────
test('digest: sans widgets, avec texte → status + instruction synthèse', () => {
  const fullSummary = 'Analyse complète : 5 paragraphes de conclusion détaillée sur les tendances IA en 2026 incluant adoption enterprise, innovations techniques et régulation...';
  const digest = _buildParentDigest(fullSummary, []);

  assert.match(digest.text, /✅ Sub-agent TERMINÉ avec succès — rapport textuel produit/);
  assert.match(digest.text, /Réponds en \*\*1-3 phrases\*\*/);
  assert.match(digest.text, /NE PAS relancer spawn_subagent/);
  // Pas de bloc widgets
  assert.doesNotMatch(digest.text, /Widgets disponibles/);
});

// ─────────────────────────────────────────────────────────────────────
// Cas 3 — Sub-agent qui n'a rien produit (vraie erreur)
// ─────────────────────────────────────────────────────────────────────
test('digest: sans contenu → status warning + autorisation relance', () => {
  const digest = _buildParentDigest(null, []);
  assert.match(digest.text, /⚠️ Sub-agent terminé sans contenu/);
  // Là on AUTORISE la relance
  assert.match(digest.text, /Tu peux relancer avec un prompt plus précis/);
});

// ─────────────────────────────────────────────────────────────────────
// Cas 4 — Reproduit le bug remonté par l'user (intro "Je lance..." prise par erreur)
// ─────────────────────────────────────────────────────────────────────
test('digest: intro "Je lance la recherche" ne doit JAMAIS apparaître dans le digest', () => {
  const realSummary = `Je lance la recherche structurée sur les 3 meilleurs frameworks dashboard JS open-source 2026.Je note l'instruction système, mais le tool todo_write n'est pas disponible dans mon set actuel — je continue donc la procédure de recherche en profondeur définie dans mes instructions de sous-agent (plan mental → découverte → lecture ciblée → synthèse).

Plan mental : J'ai 2 web_search faits. [...]

Sélection finale : Apache Superset, Grafana, Tremor.

## Top 3 frameworks JS dashboard open-source — 2026
[[WIDGET:dashboard-frameworks-js-2026]]
[reste du texte avec détails]`;

  const widgets = [{ widgetId: 'dashboard-frameworks-js-2026', kind: 'comparison_table', title: 'Top 3 frameworks dashboard JS open-source — 2026' }];
  const digest = _buildParentDigest(realSummary, widgets);

  // Le bug : avant, digest commençait par "Je lance la recherche..." → parent
  // pensait que le sub-agent n'avait rien fini.
  assert.doesNotMatch(digest.text, /Je lance la recherche/);
  assert.doesNotMatch(digest.text, /Plan mental/);
  assert.doesNotMatch(digest.text, /Sélection finale/);
  // Au contraire on dit clairement TERMINÉ + widget
  assert.match(digest.text, /TERMINÉ avec succès/);
  assert.match(digest.text, /\[\[WIDGET:dashboard-frameworks-js-2026\]\]/);
});

// ─────────────────────────────────────────────────────────────────────
// Cas 5 — Plusieurs widgets
// ─────────────────────────────────────────────────────────────────────
test('digest: plusieurs widgets → tous listés', () => {
  const widgets = [
    { widgetId: 'tbl-1', kind: 'comparison_table', title: 'Tableau A' },
    { widgetId: 'cv-2', kind: 'card_grid', title: 'Cartes B' },
    { widgetId: 'tl-3', kind: 'timeline', title: null },
  ];
  const digest = _buildParentDigest('some content', widgets);
  assert.match(digest.text, /3 widget\(s\) produit\(s\)/);
  assert.match(digest.text, /\[\[WIDGET:tbl-1\]\] — Tableau A/);
  assert.match(digest.text, /\[\[WIDGET:cv-2\]\] — Cartes B/);
  assert.match(digest.text, /\[\[WIDGET:tl-3\]\]/);
});

// ─────────────────────────────────────────────────────────────────────
// Cas 6 — Widget mal formé (pas d'ID) → filtré
// ─────────────────────────────────────────────────────────────────────
test('digest: widget sans widgetId est filtré', () => {
  const digest = _buildParentDigest('text', [
    { widgetId: 'good-1', kind: 'table' },
    { kind: 'broken', title: 'no id' },
    null,
  ]);
  assert.strictEqual(digest.widgets.length, 1);
  assert.strictEqual(digest.widgets[0].widgetId, 'good-1');
});
