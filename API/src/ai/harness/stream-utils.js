// Utilitaires de stream LLM pour le harness :
//   - nextWithTimeout : itère avec timeout + abort signal (no leak)
//   - buildCapsuleInstructions : prompt fragment pour le mode chat

const { getCapsuleInfo } = require('../tool-groups');

const STREAM_TIMEOUT_MS = parseInt(process.env.AI_STREAM_TIMEOUT_MS || '240000', 10);

/**
 * Read next value from async iterator with timeout + abort signal.
 * Rejects immediately if signal is aborted or fires abort during wait.
 *
 * CRITIQUE : le timer DOIT aussi cleanup() sinon le listener onAbort reste
 * attaché au signal après timeout → fuite mémoire progressive.
 */
function nextWithTimeout(iterator, timeoutMs, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Stream aborted'));

    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Stream aborted'));
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`LLM stream timeout: no event for ${timeoutMs / 1000}s`));
    }, timeoutMs);

    if (signal) signal.addEventListener('abort', onAbort, { once: true });

    iterator.next().then(
      r => { if (!settled) { settled = true; cleanup(); resolve(r); } },
      e => { if (!settled) { settled = true; cleanup(); reject(e); } },
    );
  });
}

/**
 * Build capsule instructions for the system prompt (chat mode only).
 * Liste les capsules disponibles + règles d'activation/utilisation.
 */
function buildCapsuleInstructions(activeCapsules) {
  const info = getCapsuleInfo();
  const lines = Object.entries(info).map(([name, i]) => {
    const active = activeCapsules.has(name) ? ' (ACTIVE)' : '';
    return `- **${name}** : ${i.description} (${i.toolCount})${active}`;
  });

  return `

## Capsules d'outils

Tu disposes d'un set de base (~18 outils) toujours disponibles.
Pour des tâches spécialisées, active une capsule avec \`activate_capsule\`.

### Capsules disponibles
${lines.join('\n')}

### Quand activer
- **workflow** : Créer ou modifier un workflow/automatisation
- **form** : Créer ou modifier un formulaire
- **node_args** : Configurer les arguments d'un nœud

### Règles
- **PAS de capsule** pour : questions simples, mémoire, exécutions directes (search_tools → execute_tool)
- Active **DÈS** que nécessaire, ne demande pas la permission
- Après activation, les outils de la capsule deviennent des **TOOL CALLS DIRECTS** dans ta liste d'outils
- **APPELLE-LES DIRECTEMENT** : \`create_flow\`, \`add_node\`, \`connect_nodes\`, etc. — comme n'importe quel autre tool call
- **INTERDIT** : \`search_tools("create_flow")\` ou \`get_tool_details("add_node")\` — ces outils builder ne sont PAS des NodeTemplates
- \`search_tools\` / \`get_tool_details\` = cherche les **NodeTemplates** (actions plugin : Odoo, Slack, Email…)
- Les outils builder = **commandes directes** déjà dans ta liste d'outils après activation
- Après activation, utilise \`search_manual\` pour récupérer les règles détaillées du mode`;
}

module.exports = { nextWithTimeout, buildCapsuleInstructions, STREAM_TIMEOUT_MS };
