// Live Preview Router
// Mappe un toolName → previewType utilisé par le frontend pour choisir le composant.

'use strict';

const PREVIEW_MAP = Object.freeze({
  render_structured: 'structured',
  generate_diagram:  'diagram',
  propose_plan:      'plan',
  generate_document: 'document',
  edit_document:     'document',
  research_deep:     'research',
  spawn_subagent:    'subagent',
  web_download:      'download',
  execute_code:      'code',
});

/**
 * Retourne le previewType pour un toolName, ou null si non prévu pour live preview.
 * @param {string} toolName
 * @returns {string|null}
 */
function detectPreviewType(toolName) {
  return PREVIEW_MAP[toolName] || null;
}

/**
 * Retourne la liste des tool names supportés.
 */
function listLivePreviewTools() {
  return Object.keys(PREVIEW_MAP);
}

module.exports = {
  detectPreviewType,
  listLivePreviewTools,
  PREVIEW_MAP,
};
