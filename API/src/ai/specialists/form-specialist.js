// Form specialist — builds/modifies forms
// Groups: core + navigation + project_memory + thread + form

const { resolveToolGroups } = require('../tool-groups');
const { buildBasePrompt } = require('../prompts/base');
const { buildFormPrompt } = require('../prompts/form-builder');
const { runSpecialist } = require('./run-specialist');

const GROUPS = ['core', 'navigation', 'project_memory', 'thread', 'form'];

async function* runFormSpecialist({ messages, context, metadata, agentOverrides }) {
  const sideEvents = [];
  const emit = (ev) => sideEvents.push(ev);

  const modeMetadata = {
    ...(metadata || {}),
    workspaceId: context.workspaceId || metadata?.workspaceId,
  };
  context._metadata = modeMetadata;

  const toolSet = resolveToolGroups(GROUPS, {
    context,
    metadata: modeMetadata,
    emit,
    blockedTools: agentOverrides?.blockedTools || [],
  });

  const origExecute = toolSet.execute.bind(toolSet);
  toolSet.execute = async (name, input) => {
    const result = await origExecute(name, input);
    if (sideEvents.length) {
      if (!toolSet._pendingSideEvents) toolSet._pendingSideEvents = [];
      toolSet._pendingSideEvents.push(...sideEvents);
      sideEvents.length = 0;
    }
    return result;
  };

  let systemPrompt = buildBasePrompt(context) + buildFormPrompt();
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

  const gen = runSpecialist({
    toolSet,
    systemPrompt,
    messages,
    llmConfig: context.llmConfig,
    context,
    agentOverrides,
    maxLoops: agentOverrides?.maxToolLoops || 40,
  });

  for await (const event of gen) {
    yield event;
    if (toolSet._pendingSideEvents?.length) {
      for (const ev of toolSet._pendingSideEvents) yield ev;
      toolSet._pendingSideEvents.length = 0;
    }
  }
}

module.exports = { runFormSpecialist, GROUPS };
