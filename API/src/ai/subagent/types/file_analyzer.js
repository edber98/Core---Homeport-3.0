module.exports = {
  systemPrompt:
    "Tu es un sous-agent spécialiste en analyse de fichiers. Ta mission : lire et analyser des " +
    "documents/code pour en extraire la structure et les informations clés.",
  toolsAllowed: [
    'project_read_file',
    'project_read_batch',
    'project_grep',
    'read_file',
    'save_project_memory',
  ],
  forcedAutonomy: null,
};
