// Tests pour le broadcast / streaming : garantir qu'on ne persiste pas les
// deltas streaming (sinon freeze) + que le forward thread fonctionne.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const JOB_RUNNER = fs.readFileSync(
  path.resolve(__dirname, '..', 'jobs', 'job-runner.js'),
  'utf8',
);

test('SKIP_PERSIST_TYPES inclut tool.input_delta et ui.preview.*', () => {
  const match = JOB_RUNNER.match(/SKIP_PERSIST_TYPES\s*=\s*new Set\(\[([^\]]+)\]\)/);
  assert.ok(match, 'SKIP_PERSIST_TYPES non trouvé — sans ça, 1000+ DB writes par stream = app freeze');
  const types = match[1];
  assert.ok(types.includes("'tool.input_delta'"), 'tool.input_delta doit être skippé');
  assert.ok(types.includes("'ui.preview.delta'"), 'ui.preview.delta doit être skippé');
});

test('message text deltas sont agrégés (debounce 500ms)', () => {
  // Vérifie qu'on a un _textBuffer + flush timer au lieu d'un write par delta
  assert.ok(JOB_RUNNER.includes('_textBuffer'), 'message text doit être aggrégé');
  assert.ok(/setTimeout\(_flushTextBuffer,\s*\d+\)/.test(JOB_RUNNER), 'flush text debounced');
});

test('broadcast forward tool events pour parent resume', () => {
  // Les events tool.start/tool.end doivent remonter au thread bus pour
  // l'affichage live dans le chat pendant resume parent.
  assert.ok(
    JOB_RUNNER.includes('isParentResumeStream'),
    'logique de forward des tool events pour agent_run non-subagent',
  );
});

test('placeholder streaming utilise updateOne au final (pas create)', () => {
  // Si on crée un nouveau message en plus du placeholder, on a 2 bulles
  assert.ok(
    /AiMessage\.updateOne\([^)]*opts\._streamingMessageId/s.test(JOB_RUNNER),
    'le placeholder doit être UPDATE à la fin, pas dupliqué avec CREATE',
  );
});

test('streamingMessageId tag sur les events forwardés', () => {
  assert.ok(
    JOB_RUNNER.includes('_streamingMessageId: streamingMessageId'),
    'les events streamés doivent porter _streamingMessageId pour que le frontend les applique',
  );
});
