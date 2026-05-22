// Résolution des overrides d'agent à appliquer au harness.
//
// 3 types d'agents :
//   - 'general' (ou vide) → pas d'override, agent généraliste
//   - 'provider:<key>' → agent système d'un provider spécifique (Odoo, Slack…)
//     Le prompt liste tous les NodeTemplates de ce provider.
//   - 'aia_xxx' → AiAgent custom stocké en DB
//     Peut overrider llmProvider, llmModel, allowedProviders, blockedTools, etc.
//
// Le résultat est passé au harness comme `agentOverrides`. La couche harness/
// l'applique aux prompts et tools.

const AiAgent = require('../../../db/models/ai-agent.model');
const NodeTemplate = require('../../../db/models/node-template.model');
const Provider = require('../../../db/models/provider.model');

/**
 * @param {string} agentId
 * @param {object} context - construit par buildContext() : doit contenir availableProviders
 * @returns {Promise<object|null>}
 */
async function resolveAgentOverrides(agentId, context) {
  if (!agentId || agentId === 'general') return null;

  // ── Agent système : provider:<key> ─────────────────────────────────
  if (agentId.startsWith('provider:')) {
    return _resolveSystemAgent(agentId, context);
  }

  // ── Agent custom : aia_xxx ─────────────────────────────────────────
  return _resolveCustomAgent(agentId);
}

async function _resolveSystemAgent(agentId, context) {
  const providerKey = agentId.slice('provider:'.length);
  const provider = (context.availableProviders || []).find(p => p.key === providerKey);
  if (!provider) return null;

  // Liste tous les NodeTemplates du provider pour les exposer dans le prompt
  const templates = await NodeTemplate.find(
    { providerKey, enabled: { $ne: false } },
    'key title description type'
  ).lean();

  const toolLines = templates.map(t =>
    `- \`${t.key}\` : ${t.title || t.key}${t.description ? ' — ' + t.description : ''}`
  );

  const promptFragment = `Tu es un spécialiste ${provider.name}. Tu connais parfaitement les outils ${provider.name} et tu privilégies leur utilisation.

### Outils ${provider.name} disponibles (${templates.length})
${toolLines.join('\n')}

### RÈGLES CRITIQUES — mode agent ${provider.name}

1. **TOUJOURS utiliser \`execute_tool\`** pour interagir avec ${provider.name}. Tu as la liste complète des outils ci-dessus — utilise-les directement avec la bonne clé.

2. **JAMAIS \`search_tools\` pour chercher des DONNÉES** — \`search_tools\` cherche des templates/actions dans la plateforme, PAS dans ${provider.name}. Quand l'utilisateur dit "cherche X", "trouve X", "liste X", il parle de données ${provider.name}.

3. **Recherche et filtrage** — Les outils de type "Lister" acceptent généralement des paramètres de filtrage (search, query, name, etc.). Si tu ne connais pas les paramètres exacts, utilise \`get_tool_details\` avec la clé pour voir le schéma complet des arguments AVANT d'exécuter.

4. **Autonomie** — Respecte le niveau d'autonomie défini dans les règles générales pour les confirmations.

5. **Vocabulaire utilisateur** — L'utilisateur peut utiliser des termes génériques ("cherche", "montre-moi", "je veux voir") ou des termes spécifiques à ${provider.name}. Dans tous les cas, identifie l'outil ${provider.name} approprié et exécute-le.`;

  return { promptFragment };
}

async function _resolveCustomAgent(agentId) {
  const agent = await AiAgent.findOne({ id: agentId }).lean();
  if (!agent) return null;

  let promptFragment = agent.systemPrompt || '';

  // Multi-provider : charge les NodeTemplates de tous les allowedProviders
  if (agent.allowedProviders?.length) {
    const providerDocs = await Provider.find(
      { key: { $in: agent.allowedProviders } },
      'key name title'
    ).lean();
    const templates = await NodeTemplate.find(
      { providerKey: { $in: agent.allowedProviders }, enabled: { $ne: false } },
      'key title description type providerKey'
    ).lean();

    // Group par provider
    const byProvider = {};
    for (const t of templates) {
      if (!byProvider[t.providerKey]) byProvider[t.providerKey] = [];
      byProvider[t.providerKey].push(t);
    }

    const sections = [];
    for (const p of providerDocs) {
      const pTemplates = byProvider[p.key] || [];
      const toolLines = pTemplates.map(t =>
        `- \`${t.key}\` : ${t.title || t.key}${t.description ? ' — ' + t.description : ''}`
      );
      sections.push(`### ${p.title || p.name} (${pTemplates.length} actions)\n${toolLines.join('\n')}`);
    }

    if (sections.length) {
      promptFragment += `\n\n## Outils des providers associés\nTu as accès aux outils suivants. Utilise-les directement via \`execute_tool\` avec la clé correspondante.\n\n${sections.join('\n\n')}`;
    }
  }

  return {
    promptFragment: promptFragment || null,
    llmProvider: agent.llmProvider || null,
    llmModel: agent.llmModel || null,
    toolGroups: agent.toolGroups?.length ? agent.toolGroups : null,
    blockedTools: agent.blockedTools?.length ? agent.blockedTools : null,
    maxToolLoops: agent.maxToolLoops || null,
    routerBehavior: agent.routerBehavior || null,
    autonomyLevel: agent.autonomyLevel || null,
  };
}

module.exports = { resolveAgentOverrides };
