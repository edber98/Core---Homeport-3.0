// Chat specialist — general conversation, memory, thread management
// Groups: core + navigation + project_memory + thread

const { resolveToolGroups } = require('../tool-groups');
const { buildBasePrompt } = require('../prompts/base');
const { runSpecialist } = require('./run-specialist');

const GROUPS = ['core', 'navigation', 'project_memory', 'thread'];

function buildChatSpecialistPrompt() {
  return `
## Mode — Conversation

Tu es l'assistant Kinn. Réponds aux questions de l'utilisateur de manière claire et concise.

Tu peux :
- Répondre à des questions générales sur Kinn et ses fonctionnalités
- Sauvegarder/récupérer des informations dans la mémoire (globale ou projet)
- Ouvrir des éléments (workflows, formulaires)
- Gérer les conversations (transfert de thread)

Si l'utilisateur demande une action technique (exécuter un outil, créer un workflow, modifier un formulaire), indique-lui que tu vas le rediriger vers le bon spécialiste.
`;
}

async function* runChatSpecialist({ messages, context, metadata, agentOverrides }) {
  const modeMetadata = {
    ...(metadata || {}),
    workspaceId: context.workspaceId || metadata?.workspaceId,
  };
  context._metadata = modeMetadata;

  const toolSet = resolveToolGroups(GROUPS, {
    context,
    metadata: modeMetadata,
    blockedTools: agentOverrides?.blockedTools || [],
  });

  let systemPrompt = buildBasePrompt(context) + buildChatSpecialistPrompt();
  if (context._agentPromptFragment) {
    systemPrompt += '\n\n## Spécialisation agent\n' + context._agentPromptFragment;
  }
  if (context._projectMemory && Object.keys(context._projectMemory).length) {
    const lines = Object.entries(context._projectMemory).map(([k, v]) =>
      `- ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`
    );
    systemPrompt += '\n\n## Mémoire du projet\n' + lines.join('\n');
  }
  if (context.user?.preferences?.customInstructions?.trim()) {
    systemPrompt += '\n\n## Instructions utilisateur\n' + context.user.preferences.customInstructions.trim();
  }
  if (agentOverrides?.systemPrompt) {
    systemPrompt += '\n\n## Instructions personnalisées\n' + agentOverrides.systemPrompt;
  }

  yield* runSpecialist({
    toolSet,
    systemPrompt,
    messages,
    llmConfig: context.llmConfig,
    context,
    agentOverrides,
    maxLoops: agentOverrides?.maxToolLoops || 10,
  });
}

module.exports = { runChatSpecialist, GROUPS };
