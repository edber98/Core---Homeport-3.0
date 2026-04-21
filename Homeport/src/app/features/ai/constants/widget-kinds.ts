// Miroir frontend de API/src/ai/constants/widget-kinds.js
// Source unique de vérité côté Angular pour éviter les enums divergents.

export const WIDGET_KINDS = [
  'structured',
  'canvas_html',
  'diagram',
  'image_inline',
  'file_inline',
  'todo_list',
] as const;

export const SYSTEM_KINDS = [
  'system_note',
  'system_hint',
  'permission_request',
  'cache_sync_request',
] as const;

export const REPORT_KINDS = [
  'agent_report',
  'comment',
] as const;

export const NON_TEXT_KINDS = [
  ...WIDGET_KINDS,
  ...SYSTEM_KINDS,
  ...REPORT_KINDS,
] as const;

export type WidgetKind = typeof WIDGET_KINDS[number];
export type SystemKind = typeof SYSTEM_KINDS[number];
export type ReportKind = typeof REPORT_KINDS[number];

const WIDGET_SET = new Set<string>(WIDGET_KINDS);
const NON_TEXT_SET = new Set<string>(NON_TEXT_KINDS);

export function isWidgetKind(kind: string | null | undefined): boolean {
  return !!kind && WIDGET_SET.has(kind);
}

export function isNonTextKind(kind: string | null | undefined): boolean {
  return !!kind && NON_TEXT_SET.has(kind);
}
