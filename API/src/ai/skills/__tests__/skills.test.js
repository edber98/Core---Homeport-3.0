// Tests for the SKILL.md loader / meta-tools. Runnable via `npm test`.
// No DB, no sandbox required: we only exercise the registry / parsing.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadSkills, listSkills, getSkill, parseSkillMarkdown } = require('../skill-loader');
const {
  SKILL_META_TOOL_DEFINITIONS,
  executeSkillMetaTool,
} = require('../../tools/skill-meta-tools');

const BUNDLE_DIR = path.resolve(__dirname, '..', '..', '..', '..', 'skills-bundle');

test('loader discovers every SKILL.md', async () => {
  const res = await loadSkills(BUNDLE_DIR);
  assert.ok(res.count >= 6, `expected >=6 skills, got ${res.count} (errors=${JSON.stringify(res.errors)})`);
  assert.equal(res.errors.length, 0, `skill load errors: ${JSON.stringify(res.errors)}`);
});

test('parseSkillMarkdown extracts frontmatter + body', () => {
  const src = `---\nname: test-skill\ndescription: A test\nruntime: node\n---\n\n# Body\nHello.`;
  const { frontmatter, body } = parseSkillMarkdown(src);
  assert.equal(frontmatter.name, 'test-skill');
  assert.equal(frontmatter.runtime, 'node');
  assert.match(body, /Body/);
});

test('required skills are present with valid fields', async () => {
  await loadSkills(BUNDLE_DIR);
  const expected = [
    'docx-create', 'docx-edit', 'pptx-create', 'pptx-designed',
    'xlsx-create', 'frontend-html', 'webapp-bundle',
  ];
  for (const name of expected) {
    const s = getSkill(name);
    assert.ok(s, `missing skill: ${name}`);
    assert.ok(s.description && s.description.length > 0, `missing description for ${name}`);
    assert.ok(['node', 'python', 'shell'].includes(s.runtime), `invalid runtime for ${name}: ${s.runtime}`);
    assert.ok(s.entrypoint, `missing entrypoint for ${name}`);
    assert.ok(s.body && s.body.length > 0, `missing body for ${name}`);
  }
});

test('skill_list meta-tool returns entries', async () => {
  await loadSkills(BUNDLE_DIR);
  const out = await executeSkillMetaTool('skill_list', {}, {});
  assert.ok(Array.isArray(out.items));
  assert.ok(out.count >= 6);
  assert.ok(out.items.every((s) => s.name && s.description));
});

test('skill_list filter by runtime=node', async () => {
  await loadSkills(BUNDLE_DIR);
  const out = await executeSkillMetaTool('skill_list', { runtime: 'node' }, {});
  assert.ok(out.count >= 3);
  assert.ok(out.items.every((s) => s.runtime === 'node'));
});

test('skill_get returns full body markdown', async () => {
  await loadSkills(BUNDLE_DIR);
  const out = await executeSkillMetaTool('skill_get', { name: 'pptx-designed' }, {});
  assert.equal(out.name, 'pptx-designed');
  assert.equal(out.runtime, 'node');
  assert.match(out.body, /Quand utiliser/);
  assert.match(out.body, /Charts supportés/);
});

test('skill_get unknown skill → error', async () => {
  const out = await executeSkillMetaTool('skill_get', { name: 'does-not-exist' }, {});
  assert.ok(out.error);
});

test('meta-tool definitions are well-formed', () => {
  for (const def of SKILL_META_TOOL_DEFINITIONS) {
    assert.ok(def.name);
    assert.ok(def.description);
    assert.ok(def.parameters && def.parameters.type === 'object');
  }
});
