// General-purpose subagent — access to every tool except subagent spawning & thread transfer.
// Autonomy forced to 'prudent' to slow down destructive actions in a nested context.

module.exports = {
  systemPrompt:
    "Tu es un sous-agent polyvalent. Autonomie forcée en 'prudent' pour actions métier.",
  toolsAllowed: null, // null → all tools except the denylist below
  toolsDenied: ['compact_and_transfer', 'spawn_subagent'],
  forcedAutonomy: 'prudent',
};
