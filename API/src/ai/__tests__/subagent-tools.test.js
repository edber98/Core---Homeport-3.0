// Tests pour les invariants des subagents (tool scoping, auto-close, etc.)

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SUB_RUNNER = fs.readFileSync(
  path.resolve(__dirname, '..', 'subagent', 'sub-runner.js'),
  'utf8',
);

const HARNESS = fs.readFileSync(
  path.resolve(__dirname, '..', 'agent-harness.js'),
  'utf8',
);

test('subagents ne doivent PAS avoir accès à todo_write', () => {
  // Recherche de WIDGET_TOOLS_ALWAYS_ALLOWED ou équivalent
  const match = SUB_RUNNER.match(/WIDGET_TOOLS_ALWAYS_ALLOWED\s*=\s*\[([^\]]+)\]/);
  assert.ok(match, 'WIDGET_TOOLS_ALWAYS_ALLOWED non trouvé');
  assert.ok(
    !match[1].includes("'todo_write'"),
    'todo_write ne doit PAS être dans WIDGET_TOOLS_ALWAYS_ALLOWED — seul le parent gère la checklist',
  );
});

test('subagents ont accès aux widget tools + send_message_to_agent', () => {
  const match = SUB_RUNNER.match(/WIDGET_TOOLS_ALWAYS_ALLOWED\s*=\s*\[([^\]]+)\]/);
  assert.ok(match);
  const allowed = match[1];
  for (const required of ['render_structured', 'send_message_to_agent']) {
    assert.ok(allowed.includes(`'${required}'`), `${required} doit être dans WIDGET_TOOLS_ALWAYS_ALLOWED`);
  }
});

test('sub-runner retire explicitement todo_write même si hérité', () => {
  // Si un subagent type avait todo_write dans son typeDef, il doit être retiré
  assert.ok(
    SUB_RUNNER.includes("merged.delete('todo_write')"),
    'sub-runner doit retirer explicitement todo_write',
  );
});

test('input_from dedup activé', () => {
  assert.ok(
    SUB_RUNNER.includes('new Set(sourceIds'),
    'input_from doit dédupliquer les sourceIds',
  );
});

test('harness empty promise nudge supprimé', () => {
  assert.ok(
    !/nudging LLM to actually execute/.test(HARNESS),
    'le nudge empty promise doit être supprimé',
  );
  assert.ok(
    !/EMPTY_PROMISE_PATTERNS/.test(HARNESS),
    'le regex EMPTY_PROMISE_PATTERNS doit être retiré',
  );
});
