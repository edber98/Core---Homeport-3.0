// Source unique de vérité pour les "kinds" d'AiMessage qui portent un widget
// visuel (pas du texte). Importée partout où on filtre/route par kind pour
// éviter les enums divergents dans 3-4 fichiers.

/**
 * Kinds de messages qui portent un widget/rendu visuel (pas juste du texte).
 * Utilisé pour filtrage messageGroups, WIDGET_KINDS audits, routage UI.
 */
const WIDGET_KINDS = Object.freeze([
  'structured',
  'canvas_html',
  'diagram',
  'image_inline',
  'file_inline',
  'todo_list',
]);

/**
 * Kinds qui sont des "messages système" à skip dans la logique resume parent
 * (ni widget ni message texte utile pour trouver le parent "significatif").
 */
const SYSTEM_KINDS = Object.freeze([
  'system_note',
  'system_hint',
  'permission_request',
  'cache_sync_request',
]);

/**
 * Kinds qui sont des "rapports" des subagents (card avec summary + tools).
 */
const REPORT_KINDS = Object.freeze([
  'agent_report',
  'comment',
]);

/**
 * Tous les kinds "non-texte" à exclure quand on cherche un vrai message parent.
 * = widgets + system + reports
 */
const NON_TEXT_KINDS = Object.freeze([
  ...WIDGET_KINDS,
  ...SYSTEM_KINDS,
  ...REPORT_KINDS,
]);

/**
 * Kinds autorisés dans le schéma Mongoose AiMessage.metadata.kind (enum).
 * Doit rester synchronisé avec ai-message.model.js.
 */
const ALL_MESSAGE_KINDS = Object.freeze([
  ...WIDGET_KINDS,
  ...SYSTEM_KINDS,
  ...REPORT_KINDS,
  'plan_proposal',
]);

/**
 * Vérifie si un kind est un widget visuel (peut être filtré/masqué de la timeline).
 */
function isWidgetKind(kind) {
  return !!kind && WIDGET_KINDS.includes(kind);
}

module.exports = {
  WIDGET_KINDS,
  SYSTEM_KINDS,
  REPORT_KINDS,
  NON_TEXT_KINDS,
  ALL_MESSAGE_KINDS,
  isWidgetKind,
};
