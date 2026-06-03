// Helpers de formatage pour les tools — labels FR + résumé d'args.
// Partagé entre le harness loop et les modules permission-flow / todo-control.

const _STATIC_TOOL_LABELS = {
  read_file: 'Lire un fichier',
  write_file: 'Écrire un fichier',
  delete_file: 'Supprimer un fichier',
  list_directory: 'Lister un dossier',
  execute_code: 'Exécuter du code',
  prepare_code_environment: 'Préparer l\'environnement d\'exécution',
  run_workflow: 'Lancer un workflow',
  project_write_file: 'Écrire un fichier projet',
  project_read_file: 'Lire un fichier projet',
  project_read_batch: 'Lire plusieurs fichiers projet',
  project_delete: 'Supprimer un fichier projet',
  project_move: 'Déplacer un fichier projet',
  project_create_folder: 'Créer un dossier projet',
  project_stage_for_sandbox: 'Préparer un fichier pour la sandbox',
  project_sync_remote: 'Synchroniser avec le distant',
  install_package: 'Installer un package',
  generate_document: 'Générer un document',
  edit_document: 'Éditer un document',
  search_tools: 'Rechercher un outil',
  get_tool_details: 'Détails d\'un outil',
  spawn_subagent: 'Lancer un sous-agent',
  research_deep: 'Recherche approfondie',
  web_search: 'Rechercher sur le web',
  web_fetch: 'Lire une page web',
  web_download: 'Télécharger un fichier web',
  save_memory: 'Sauvegarder en mémoire',
  save_project_memory: 'Sauvegarder la mémoire projet',
  build_website: 'Construire un site web',
};

/**
 * Résout le label FR d'un tool. Pour execute_tool, on lookup le NodeTemplate
 * par sa key pour afficher le vrai titre (ex: "Slack — Envoyer un message").
 */
async function resolveToolLabel(toolName, input) {
  if (toolName === 'execute_tool' && input?.key) {
    try {
      const NodeTemplate = require('../../db/models/node-template.model');
      const tpl = await NodeTemplate.findOne({ key: input.key }, 'title name').lean();
      const label = tpl?.title || tpl?.name;
      if (label) return `${label}`;
    } catch { /* non-fatal */ }
    return String(input.key);
  }
  return _STATIC_TOOL_LABELS[toolName] || toolName;
}

/** Résumé court (300 chars max) des args d'un tool pour affichage UI. */
function summarizeArgs(args, maxChars = 300) {
  try {
    const s = JSON.stringify(args || {});
    return s.length > maxChars ? s.slice(0, maxChars) + '…' : s;
  } catch { return String(args || ''); }
}

/** Résumé 1-ligne des args d'un tool (hint context affichage). */
function summarizeToolArgs(name, args) {
  if (!args || typeof args !== 'object') return '';
  if (args.query) return `"${String(args.query).slice(0, 80)}"`;
  if (args.url) return String(args.url).replace(/^https?:\/\//, '').slice(0, 80);
  if (args.path) return String(args.path).slice(0, 80);
  if (args.fileId) return String(args.fileId);
  if (args.key) return String(args.key);
  if (args.prompt) return `"${String(args.prompt).slice(0, 80)}"`;
  if (args.subagent_type) return String(args.subagent_type);
  if (args.to) return String(args.to);
  if (args.language) return `${args.language}${args.code ? ` (${String(args.code).length}c)` : ''}`;
  return '';
}

module.exports = { resolveToolLabel, summarizeArgs, summarizeToolArgs, _STATIC_TOOL_LABELS };
