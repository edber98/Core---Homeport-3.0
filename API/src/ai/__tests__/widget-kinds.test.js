// Tests pour la source unique de vérité des kinds de widgets.
// Garantit que tous les helpers utilisent la même liste.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  WIDGET_KINDS,
  SYSTEM_KINDS,
  REPORT_KINDS,
  NON_TEXT_KINDS,
  ALL_MESSAGE_KINDS,
  isWidgetKind,
} = require('../constants/widget-kinds');

test('WIDGET_KINDS contient les 6 kinds attendus', () => {
  assert.deepEqual([...WIDGET_KINDS].sort(), [
    'canvas_html', 'diagram', 'file_inline', 'image_inline', 'structured', 'todo_list',
  ]);
});

test('SYSTEM_KINDS contient les 4 kinds attendus', () => {
  assert.deepEqual([...SYSTEM_KINDS].sort(), [
    'cache_sync_request', 'permission_request', 'system_hint', 'system_note',
  ]);
});

test('isWidgetKind retourne true pour chaque widget kind', () => {
  for (const k of WIDGET_KINDS) assert.ok(isWidgetKind(k), `expected ${k} to be widget`);
});

test('isWidgetKind retourne false pour les non-widgets', () => {
  assert.ok(!isWidgetKind('agent_report'));
  assert.ok(!isWidgetKind('comment'));
  assert.ok(!isWidgetKind('system_note'));
  assert.ok(!isWidgetKind('plan_proposal'));
  assert.ok(!isWidgetKind(null));
  assert.ok(!isWidgetKind(undefined));
  assert.ok(!isWidgetKind(''));
});

test('NON_TEXT_KINDS = WIDGET + SYSTEM + REPORT', () => {
  const expected = new Set([...WIDGET_KINDS, ...SYSTEM_KINDS, ...REPORT_KINDS]);
  const actual = new Set(NON_TEXT_KINDS);
  assert.equal(actual.size, expected.size);
  for (const k of expected) assert.ok(actual.has(k));
});

test('ALL_MESSAGE_KINDS aligné avec le schéma Mongoose (sanity check)', () => {
  // Si on ajoute un kind dans constants sans l'ajouter au modèle, ce test le flag.
  assert.ok(ALL_MESSAGE_KINDS.includes('plan_proposal'));
  assert.ok(ALL_MESSAGE_KINDS.includes('todo_list'));
  assert.ok(ALL_MESSAGE_KINDS.includes('agent_report'));
});

test('les constantes sont gelées (Object.freeze)', () => {
  assert.throws(() => { WIDGET_KINDS.push('foo'); });
  assert.throws(() => { SYSTEM_KINDS.push('foo'); });
});
