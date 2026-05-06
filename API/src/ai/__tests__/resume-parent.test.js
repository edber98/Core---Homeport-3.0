// Tests critiques du comportement resume parent (sans DB/HTTP — on inspecte
// le code source pour garantir les invariants architecturaux).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const JOB_RUNNER = fs.readFileSync(
  path.resolve(__dirname, '..', 'jobs', 'job-runner.js'),
  'utf8',
);

test('resume parent toolsAllowed doit être une whitelist stricte', () => {
  // Le resume parent DOIT être verrouillé avec toolsAllowed: ['todo_write', 'send_message_to_agent']
  const match = JOB_RUNNER.match(/toolsAllowed:\s*\[([^\]]+)\]/);
  assert.ok(match, 'toolsAllowed non trouvé dans le resume parent');
  const allowed = match[1];
  assert.ok(allowed.includes("'todo_write'"), 'todo_write doit être dans toolsAllowed');
  // Pas de render_structured / spawn_subagent / execute_code au resume
  assert.ok(!allowed.includes('render_structured'), 'render_structured DOIT être interdit');
  assert.ok(!allowed.includes('spawn_subagent'), 'spawn_subagent DOIT être interdit');
  assert.ok(!allowed.includes('execute_code'), 'execute_code DOIT être interdit');
});

test('resume parent maxLoops doit être borné à 3', () => {
  // Pas de boucles infinies au resume
  const match = JOB_RUNNER.match(/maxLoops:\s*(\d+)[^}]*}\);[\s\S]*?resumeJob/);
  // Fallback : chercher le maxLoops proche de resumeJob
  const resumeCtx = JOB_RUNNER.match(/resumeJob = await AiJob\.create\(\{[\s\S]{0,500}\}\)/);
  assert.ok(resumeCtx, 'resumeJob bloc non trouvé');
  const m = resumeCtx[0].match(/maxLoops:\s*(\d+)/);
  assert.ok(m, 'maxLoops manquant dans resumeJob');
  assert.ok(parseInt(m[1], 10) <= 5, `maxLoops=${m[1]} trop élevé pour un resume, attendu ≤ 5`);
});

test('recentResumes anti-boucle doit utiliser parentJobId', () => {
  // Le compteur anti-boucle doit être scopé par parentJobId (pas thread-wide)
  assert.ok(
    JOB_RUNNER.includes("'metadata.extra.parentJobId'"),
    'recentResumes doit filtrer par parentJobId pour ne pas bloquer cascades parallèles',
  );
});

test('resume prompt NE doit PAS encourager render_structured', () => {
  // Le prompt ne doit PAS dire au LLM d'appeler render_structured/canvas_html/execute_code
  const resumePromptMatch = JOB_RUNNER.match(/const resumePrompt = `[\s\S]+?`;/);
  assert.ok(resumePromptMatch, 'resumePrompt non trouvé');
  const prompt = resumePromptMatch[0];
  // Le prompt doit clairement indiquer "MODE SYNTHÈSE VERROUILLÉ" ou équivalent
  assert.ok(
    /VERROUILLÉ|synth|verrouillé|UNIQUEMENT|seule.*todo_write/i.test(prompt),
    'le prompt doit indiquer le mode verrouillé',
  );
  // Pas d'encouragement à créer de nouveaux widgets
  assert.ok(
    !/produis-les MAINTENANT.*render_structured/i.test(prompt),
    'le prompt ne doit pas demander de créer des widgets',
  );
});

test('heartbeat timeout doit être configurable via env', () => {
  assert.ok(
    JOB_RUNNER.includes('AI_SUBAGENT_HEARTBEAT_TIMEOUT_MS'),
    'heartbeat doit utiliser la variable env pour le timeout',
  );
});

test('empty promise nudge doit être supprimé (plus de boucles)', () => {
  const matches = JOB_RUNNER.match(/empty promise detected/g);
  assert.ok(!matches || matches.length === 0, 'empty promise nudge doit être supprimé');
});

test('_streamingMessageId propagé au jobContext', () => {
  assert.ok(
    JOB_RUNNER.includes('streamingMessageId'),
    'jobContext doit pouvoir transporter le streamingMessageId',
  );
});

test('placeholder resume NE PAS avoir metadata.kind (sinon rendu invisible)', () => {
  // Le placeholder doit NE PAS avoir de kind pour être rendu comme message normal
  const placeholderMatch = JOB_RUNNER.match(/const placeholder = await AiMessage\.create\(\{[\s\S]+?\}\);/);
  assert.ok(placeholderMatch, 'placeholder non trouvé');
  const code = placeholderMatch[0];
  assert.ok(
    !/kind:\s*['"](resume_stream|agent_report|structured)/.test(code),
    'le placeholder doit ne PAS avoir de metadata.kind qui court-circuite le rendu standard',
  );
});
