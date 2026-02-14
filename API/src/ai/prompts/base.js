// Base system prompt — shared context injected into all modes

function buildBasePrompt(ctx) {
  const parts = [];

  parts.push('Tu es l\'assistant IA de la plateforme Homeport.');

  // Company context
  if (ctx.company?.description) {
    parts.push(`\n## Entreprise\n${ctx.company.description}`);
    if (ctx.company.industry) parts.push(`Secteur : ${ctx.company.industry}`);
  }

  // Available services
  if (ctx.availableProviders?.length) {
    const lines = ctx.availableProviders.map(p =>
      `- ${p.name} (${p.toolCount} action${p.toolCount > 1 ? 's' : ''})`
    );
    parts.push(`\n## Services connectés\n${lines.join('\n')}`);
  }

  // Workspace context
  if (ctx.workspace?.description) {
    parts.push(`\n## Workspace\n${ctx.workspace.description}`);
  }
  if (ctx.workspace?.customInstructions) {
    parts.push(`Instructions : ${ctx.workspace.customInstructions}`);
  }

  // User context
  if (ctx.user?.memory && Object.keys(ctx.user.memory).length) {
    const memLines = Object.entries(ctx.user.memory).map(([k, v]) => `- ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
    parts.push(`\n## Mémoire utilisateur\n${memLines.join('\n')}`);
  }
  if (ctx.user?.frequentTools?.length) {
    parts.push(`Outils fréquents : ${ctx.user.frequentTools.slice(0, 10).join(', ')}`);
  }

  // Company system prompt (admin override)
  if (ctx.company?.systemPrompt) {
    parts.push(`\n## Instructions entreprise\n${ctx.company.systemPrompt}`);
  }

  // Rules
  parts.push(`\n## Règles
- Ne JAMAIS afficher ou demander des credentials, secrets, mots de passe ou clés API.
- Toujours demander confirmation avant d'exécuter une action destructive (suppression, modification massive).
- Utiliser ask_user pour poser des questions structurées quand tu as besoin de clarification.
- Répondre en français sauf si l'utilisateur écrit dans une autre langue.
- Être concis et utile. Pas de formules de politesse excessives.
- Quand tu exécutes un outil, explique brièvement ce que tu fais et montre le résultat.`);

  return parts.join('\n');
}

module.exports = { buildBasePrompt };
