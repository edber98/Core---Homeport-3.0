module.exports = {
  systemPrompt:
    "Tu es un sous-agent rédacteur. Produis livrables formatés (docx/pptx/xlsx/html) à partir de specs.",
  toolsAllowed: [
    'generate_document',
    'edit_document',
    'render_html_preview',
    'build_website',
    'project_read_file',
  ],
  forcedAutonomy: null,
};
