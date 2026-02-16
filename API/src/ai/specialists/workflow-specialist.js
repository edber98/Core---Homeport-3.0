// Workflow specialist — builds/modifies workflows
// Groups: core + navigation + execution + workflow_search + project_memory + thread + workflow

const { resolveToolGroups } = require('../tool-groups');
const { buildBasePrompt } = require('../prompts/base');
const { buildWorkflowPrompt } = require('../prompts/workflow-builder');
const { runSpecialist } = require('./run-specialist');

const GROUPS = ['core', 'navigation', 'execution', 'workflow_search', 'project_memory', 'thread', 'workflow'];

/**
 * @param {object} opts - Same shape as runAgent
 * @yields SSE events
 */
async function* runWorkflowSpecialist({ messages, context, metadata, agentOverrides }) {
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

  // Wire side events from emit into executor._sideEvents for draining in run-specialist
  const origExecute = toolSet.execute.bind(toolSet);
  toolSet.execute = async (name, input) => {
    const result = await origExecute(name, input);
    // After each tool execution, drain side events
    if (sideEvents.length) {
      if (!toolSet._pendingSideEvents) toolSet._pendingSideEvents = [];
      toolSet._pendingSideEvents.push(...sideEvents);
      sideEvents.length = 0;
    }
    return result;
  };

  let systemPrompt = buildBasePrompt(context) + buildWorkflowPrompt();
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
    // Flush pending side events
    if (toolSet._pendingSideEvents?.length) {
      for (const ev of toolSet._pendingSideEvents) yield ev;
      toolSet._pendingSideEvents.length = 0;
    }
  }
}

module.exports = { runWorkflowSpecialist, GROUPS };
