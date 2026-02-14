// Execution specialist — direct provider tool execution
// Groups: core + navigation + execution + workflow_search

const { resolveToolGroups } = require('../tool-groups');
const { buildBasePrompt } = require('../prompts/base');
const { buildExecutionPrompt } = require('../prompts/execution');
const { runSpecialist } = require('./run-specialist');

const GROUPS = ['core', 'navigation', 'execution', 'workflow_search'];

async function* runExecutionSpecialist({ messages, context, metadata, agentOverrides }) {
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

  let systemPrompt = buildBasePrompt(context) + buildExecutionPrompt();
  if (context._agentPromptFragment) {
    systemPrompt += '\n\n## Spécialisation agent\n' + context._agentPromptFragment;
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
    maxLoops: agentOverrides?.maxToolLoops || 20,
  });
}

module.exports = { runExecutionSpecialist, GROUPS };
