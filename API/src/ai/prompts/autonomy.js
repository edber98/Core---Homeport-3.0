// Autonomy level prompts — controls how much confirmation the agent asks for

const LEVELS = {
  prudent: `## Niveau d'autonomie : Prudent
- **Lectures** (lister, chercher, récupérer) → exécute SANS confirmation.
- **Écritures** (créer, modifier, supprimer) → demande confirmation avant d'exécuter.
- Utilise \`ask_user\` pour confirmer les actions d'écriture avant de les exécuter.`,

  balanced: `## Niveau d'autonomie : Équilibré
- **Lectures et créations/modifications** → exécute directement, sans demander confirmation.
- **Actions destructives** (suppression, déploiement, modifications massives) → demande confirmation.
- Ne pose PAS de question du type "Dois-je procéder ?" pour les opérations courantes (créer, modifier, lire).`,

  autonomous: `## Niveau d'autonomie : Autonome
- **TOUTES les actions** → exécute directement, sans demander confirmation.
- Tu ne demandes JAMAIS "Dois-je procéder ?", "Souhaites-tu que je...", "Confirme-moi" ou toute autre forme de demande de validation.
- Tu agis immédiatement et présentes le résultat.
- Utilise \`ask_user\` UNIQUEMENT en cas d'ambiguïté réelle (plusieurs interprétations possibles, information manquante indispensable).
- L'utilisateur te fait confiance pour agir. Si tu hésites entre deux options raisonnables, choisis la plus probable et exécute.`,
};

function buildAutonomyPrompt(level) {
  return LEVELS[level] || LEVELS.autonomous;
}

module.exports = { buildAutonomyPrompt };
