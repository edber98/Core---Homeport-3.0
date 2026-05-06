// Playlist of slides — each entry points to a pre-rendered MP4 with built-in
// black fade-in and fade-out (see MotionDesignLive/FadeBoundary).
//
// Drop the 13 MP4 files into /public/slices/ before running the app.

export type Slide = {
  id: string;
  title: string;
  file: string;
};

export const slides: Slide[] = [
  { id: "p00", title: "C4RBON GROUP · origine",             file: "/slices/p00-origin.mp4" },
  { id: "p01", title: "Le problème",                         file: "/slices/p01-hook.mp4" },
  { id: "p02", title: "Workflows connectés",                 file: "/slices/p02-workflow-concept.mp4" },
  { id: "p03", title: "Démo · workflow carte de visite",     file: "/slices/p03-workflow-builder.mp4" },
  { id: "p04", title: "Pont workflow ↔ agents",              file: "/slices/p04-bridge.mp4" },
  { id: "p05", title: "Augmentez vos équipes",               file: "/slices/p05-agents.mp4" },
  { id: "p06", title: "Démo · étude c4rbon.group",           file: "/slices/p06-prompt-demo.mp4" },
  { id: "p07", title: "Sandbox · l'agent code",              file: "/slices/p07-sandbox.mp4" },
  { id: "p08", title: "Permissions",                         file: "/slices/p08-permissions.mp4" },
  { id: "p09", title: "Trigger email → actions",             file: "/slices/p09-workflow-agentic.mp4" },
  { id: "p10", title: "R&D · confidentialité",               file: "/slices/p10-confidentiality.mp4" },
  { id: "p11", title: "Plus-value en entreprise",            file: "/slices/p11-use-cases.mp4" },
  { id: "p12", title: "Closing · kinn.fr",                   file: "/slices/p12-closing.mp4" },
];
