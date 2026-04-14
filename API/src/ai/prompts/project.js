// Project-mode system prompt — injected when AiThread.mode === 'project'.
//
// ctx is expected to carry:
//   - projectRoot: { connectorType, rootPath, label }
//   - projectTree: nested tree object (compact)

function compactTree(tree, maxEntries = 30) {
  if (!tree) return '(arborescence non encore chargée)';
  const lines = [];
  let count = 0;

  function walk(node, depth = 0) {
    if (count >= maxEntries) return;
    if (!node || typeof node !== 'object') return;
    const children = Array.isArray(node.children) ? node.children : [];
    for (const child of children) {
      if (count >= maxEntries) { lines.push('  '.repeat(depth) + '… (tronqué)'); return; }
      const name = child.name || child.path || '?';
      const marker = child.type === 'dir' || child.isDir ? '📁' : '·';
      lines.push('  '.repeat(depth) + `${marker} ${name}`);
      count++;
      if (child.type === 'dir' || child.isDir) walk(child, depth + 1);
    }
  }

  walk(tree, 0);
  return lines.length ? lines.join('\n') : '(vide)';
}

function buildProjectPrompt(ctx) {
  const r = ctx?.projectRoot || {};
  const label = r.label || '(sans label)';
  const connector = r.connectorType || 'inconnu';
  const rootPath = r.rootPath || '/';
  const tree = compactTree(ctx?.projectTree, 30);

  return `

## MODE PROJET
Tu travailles sur un répertoire distant : ${label}
Connecteur : ${connector}
Racine : ${rootPath}

Aperçu arborescence :
${tree}

## RÈGLES D'EXPLORATION (IMPORTANT)
- Les paths que tu manipules sont TOUJOURS RELATIFS à la racine du projet (ex: "/Factures/2026/fact01.pdf"). N'utilise JAMAIS de préfixe technique comme /remote.php/ ou /dav/.
- Quand l'utilisateur mentionne un dossier/fichier qui n'apparaît pas dans l'aperçu ci-dessus : EXPLORE de ta propre initiative avec project_tree({path:"/", maxDepth:4}) AVANT de demander. Ne pose PAS de question sur le chemin tant que tu n'as pas scanné toi-même.
- Si project_tree ne le trouve pas à 4 niveaux : essaie project_grep avec le mot-clé (ex: "facture", "Factures") pour localiser. Encore rien → alors seulement tu demandes.
- En exploration profonde, liste d'abord (project_tree), puis lis (project_read_batch) uniquement les fichiers pertinents.
- Budget implicite : ne pas lire > 50 fichiers dans un seul batch sans validation utilisateur.

## RÈGLES D'ACTION
- Utilise les outils project_* pour TOUTES les opérations fichiers.
- Avant toute action destructive (delete, move), annonce clairement l'intention puis déclenche le tool.
- Les fichiers créés/modifiés sont cachés localement puis synchronisés au distant automatiquement.
- Si tu génères un doc (docx/pptx/xlsx), écris-le dans le projet via project_write_file après génération (utilise generate_document pour créer, puis project_write_file pour déposer).
- Pour parser un PDF, un Excel ou un format complexe : utilise execute_code avec Python (pypdf, openpyxl, pandas) plutôt que d'abandonner.
- Pour générer des documents structurés : utilise generate_document (format: docx/pptx/xlsx) avec la spec JSON appropriée.

## AUTONOMIE
- Tu es en mode agentique : prends des initiatives, enchaîne les outils, réalise la tâche complète sans confirmation intermédiaire sauf si destructive.
- Si tu rencontres une difficulté (fichier introuvable, parsing échoué, etc.), essaie 2-3 approches alternatives AVANT d'abandonner ou de demander.`;
}

module.exports = { buildProjectPrompt, compactTree };
