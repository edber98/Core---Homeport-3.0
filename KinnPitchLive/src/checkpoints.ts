// Checkpoints = key frames where the Player pauses and waits for a user click.
// Each checkpoint corresponds to a distinct idea you articulate verbally —
// aligned with the paragraphs in MotionDesign/PITCH_SCRIPT.md.
//
// Keep the count small : one click per "talking point", not per visual detail.
//
// Scene start frames (from MotionDesign/src/KinnPitch.tsx) :
//   P00  0      Origin
//   P01  750    Hook
//   P02  1200   Workflow concept
//   P03  1860   Workflow builder demo
//   P04  3570   Workflow↔Agents bridge
//   P05  4290   Agents as team
//   P06  4830   Prompt demo (c4rbon study)
//   P07  7110   Sandbox
//   P08  7860   Permissions
//   P09  8460   Workflow agentic (email trigger)
//   P10  9120   Confidentiality
//   P11  9960   Use cases
//   P12  10860  Closing

export type Checkpoint = {
  frame: number;
  slide: string;
  label: string;
};

export const checkpoints: Checkpoint[] = [
  // ═══ P00 · Histoire C4RBON → Kinn (3 stops, compressed timeline) ═══
  // ① C4RBON grand + tagline · ② timeline complète (4 cartes défilent) · ③ Kinn + citation
  { frame: 0, slide: "P00", label: "C4RBON GROUP · ingénierie intelligente" },
  { frame: 410, slide: "P00", label: "4 ans de terrain → plateforme unifiée" },
  { frame: 540, slide: "P00", label: "Kinn = l'aboutissement" },

  // ═══ P01 · Le problème (2 stops) ═══
  { frame: 750, slide: "P01", label: "Vos logiciels ne se parlent pas" },
  { frame: 1050, slide: "P01", label: "30 % · 11 h · 62 %" },

  // ═══ P02 · Workflows (2 stops) ═══
  { frame: 1200, slide: "P02", label: "Décrivez votre besoin" },
  { frame: 1640, slide: "P02", label: "Pipeline automatique, aucune action humaine" },

  // ═══ P03 · Démo 1 — Workflow IA (4 stops) ═══
  { frame: 1860, slide: "P03", label: "Interface Kinn · Flow Builder" },
  { frame: 2260, slide: "P03", label: "Kinn planifie puis dépose les nœuds" },
  { frame: 2820, slide: "P03", label: "On clique sur Lancer" },
  { frame: 3400, slide: "P03", label: "Carte de visite → contact Odoo" },

  // ═══ P04 · Bridge workflow ↔ agents (1 stop) ═══
  { frame: 3570, slide: "P04", label: "Workflow + Agents · les 2 mondes" },

  // ═══ P05 · Agents comme une équipe (1 stop) ═══
  { frame: 4290, slide: "P05", label: "Augmentez vos équipes avec l'IA" },

  // ═══ P06 · Démo 2 — Étude c4rbon (4 stops) ═══
  { frame: 4830, slide: "P06", label: "On ouvre l'Assistant IA" },
  { frame: 5310, slide: "P06", label: "Denis planifie, délègue à 3 experts" },
  { frame: 5770, slide: "P06", label: "Canvas Tim & Ada en parallèle" },
  { frame: 6340, slide: "P06", label: "Livrable .xlsx aux couleurs c4rbon" },

  // ═══ P07 · Sandbox (1 stop) ═══
  { frame: 7110, slide: "P07", label: "Quand l'agent ne sait pas, il code" },

  // ═══ P08 · Permissions (1 stop) ═══
  { frame: 7860, slide: "P08", label: "Vous gardez la main" },

  // ═══ P09 · Trigger email (2 stops) ═══
  { frame: 8460, slide: "P09", label: "Email → workflow déclenché" },
  { frame: 8930, slide: "P09", label: "Actions parallèles Odoo / Slack / Gmail" },

  // ═══ P10 · Confidentialité R&D (2 stops) ═══
  { frame: 9120, slide: "P10", label: "R&D · Puissant ET confidentiel" },
  { frame: 9640, slide: "P10", label: "Anonymisation → LLM → désanonymisation" },

  // ═══ P11 · Plus-value entreprise (1 stop) ═══
  { frame: 9960, slide: "P11", label: "Moins d'étapes, plus de résultats" },

  // ═══ P12 · Closing (1 stop) ═══
  { frame: 10860, slide: "P12", label: "kinn.fr · demandez une démo" },
];

export const lastFrame = 11310;
