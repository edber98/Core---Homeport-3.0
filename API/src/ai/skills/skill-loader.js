// Skill Loader — scans a directory recursively for `SKILL.md` files, parses
// their YAML frontmatter, and exposes an in-memory registry. Inspired by the
// Anthropic "skills" repository: https://github.com/anthropics/skills
//
// A SKILL.md is a Markdown file starting with a YAML frontmatter block:
//
//   ---
//   name: pptx-designed
//   description: Crée des présentations PowerPoint modernes via pptxgenjs.
//   runtime: node
//   entrypoint: /app/skills-bundle/pptx/pptxgenjs.mjs
//   version: 1.0.0
//   mimeType: application/vnd.openxmlformats-officedocument.presentationml.presentation
//   tools: [execute_code, skill_execute]
//   tags: [pptx, presentation, design]
//   ---
//
//   # Title
//   ...body markdown (instructions for the agent)...
//
// The loader is robust: it never crashes if one skill fails to parse, it just
// records the error and skips that skill. A full reload() is always possible.

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
let yaml = null;
try { yaml = require('js-yaml'); } catch { /* tolerated — simple parser will be used */ }

const DEFAULT_DIR = process.env.SKILLS_BUNDLE_DIR
  || path.resolve(__dirname, '..', '..', '..', 'skills-bundle');

const VALID_RUNTIMES = new Set(['node', 'python', 'shell']);

// In-memory registry: Map<name, SkillEntry>
const _registry = new Map();
const _errors = [];
let _loadedFrom = null;
let _loadedAt = null;

/**
 * Walk a directory recursively, yielding every file that matches `predicate`.
 * @param {string} dir
 * @param {(abs: string) => boolean} predicate
 * @returns {Promise<string[]>}
 */
async function _walk(dir, predicate) {
  const out = [];
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (e && e.code === 'ENOENT') return out;
    throw e;
  }
  for (const ent of entries) {
    if (ent.name.startsWith('.') || ent.name === 'node_modules' || ent.name === '__pycache__') continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      const sub = await _walk(abs, predicate);
      out.push(...sub);
    } else if (ent.isFile() && predicate(abs)) {
      out.push(abs);
    }
  }
  return out;
}

/**
 * Parse a SKILL.md file content into { frontmatter, body }.
 * Supports `--- ... ---` YAML frontmatter at the top of the file.
 */
function parseSkillMarkdown(source) {
  const text = String(source || '');
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: text };
  }
  const rawFm = match[1];
  const body = match[2] || '';
  let frontmatter = {};
  if (yaml) {
    try {
      frontmatter = yaml.load(rawFm) || {};
    } catch (e) {
      const err = new Error(`yaml_parse_error: ${e.message}`);
      err.cause = e;
      throw err;
    }
  } else {
    // Minimal key:value fallback (no nested objects / arrays beyond `[a,b]`)
    for (const line of rawFm.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (v.startsWith('[') && v.endsWith(']')) {
        v = v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
      } else if (v === 'true') v = true;
      else if (v === 'false') v = false;
      else if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
      else v = v.replace(/^['"]|['"]$/g, '');
      frontmatter[m[1]] = v;
    }
  }
  return { frontmatter, body: body.trim() };
}

function _validateSkill(entry) {
  const errors = [];
  if (!entry.name || typeof entry.name !== 'string') errors.push('missing_name');
  if (!entry.description || typeof entry.description !== 'string') errors.push('missing_description');
  if (entry.runtime && !VALID_RUNTIMES.has(entry.runtime)) errors.push(`invalid_runtime:${entry.runtime}`);
  if (entry.runtime && entry.entrypoint) {
    // Entrypoint can be absolute (sandbox path) or relative to SKILL.md dir
    const abs = path.isAbsolute(entry.entrypoint)
      ? entry.entrypoint
      : path.join(entry.dirPath, entry.entrypoint);
    if (!fs.existsSync(abs)) {
      // Inside a Docker image the absolute `/app/...` path may not exist on the
      // host dev machine; we only warn in that case. Relative paths MUST exist.
      if (!path.isAbsolute(entry.entrypoint)) {
        errors.push(`entrypoint_not_found:${abs}`);
      }
    }
  }
  return errors;
}

/**
 * Load all skills from `dir`. Replaces the current registry.
 * @param {string} [dir]
 * @returns {Promise<{count: number, errors: Array<{file:string, error:string}>}>}
 */
async function loadSkills(dir = DEFAULT_DIR) {
  _registry.clear();
  _errors.length = 0;
  _loadedFrom = dir;
  _loadedAt = Date.now();

  const files = await _walk(dir, (abs) => /(^|\/)SKILL\.md$/i.test(abs) || /\.SKILL\.md$/i.test(abs));

  for (const file of files) {
    try {
      const raw = await fsp.readFile(file, 'utf8');
      const { frontmatter, body } = parseSkillMarkdown(raw);
      const dirPath = path.dirname(file);
      const entry = {
        name: frontmatter.name,
        description: frontmatter.description || '',
        runtime: frontmatter.runtime || null,          // node | python | shell | null
        entrypoint: frontmatter.entrypoint || null,    // absolute (sandbox) or rel to dirPath
        version: frontmatter.version || '0.0.0',
        license: frontmatter.license || 'unspecified',
        mimeType: frontmatter.mimeType || null,
        outputExt: frontmatter.outputExt || null,
        tools: Array.isArray(frontmatter.tools) ? frontmatter.tools : [],
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
        timeoutMs: Number.isFinite(frontmatter.timeoutMs) ? frontmatter.timeoutMs : null,
        allowNetwork: !!frontmatter.allowNetwork,
        requiresInput: !!frontmatter.requiresInput,
        body,
        dirPath,
        file,
        frontmatter,
      };
      const validationErrors = _validateSkill(entry);
      if (validationErrors.length) {
        _errors.push({ file, error: validationErrors.join(',') });
        continue;
      }
      if (_registry.has(entry.name)) {
        _errors.push({ file, error: `duplicate_skill_name:${entry.name}` });
        continue;
      }
      _registry.set(entry.name, entry);
    } catch (e) {
      _errors.push({ file, error: e.message || String(e) });
    }
  }

  return { count: _registry.size, errors: [..._errors] };
}

function _autoloadSync() {
  // Best-effort synchronous first load (used when getSkill/listSkills is called
  // before an explicit loadSkills). Falls back gracefully if anything blows up.
  if (_loadedAt) return;
  try {
    const files = [];
    const stack = [DEFAULT_DIR];
    while (stack.length) {
      const cur = stack.pop();
      let ents;
      try { ents = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
      for (const ent of ents) {
        if (ent.name.startsWith('.') || ent.name === 'node_modules' || ent.name === '__pycache__') continue;
        const abs = path.join(cur, ent.name);
        if (ent.isDirectory()) stack.push(abs);
        else if (ent.isFile() && (/(^|\/)SKILL\.md$/i.test(abs) || /\.SKILL\.md$/i.test(abs))) files.push(abs);
      }
    }
    for (const file of files) {
      try {
        const raw = fs.readFileSync(file, 'utf8');
        const { frontmatter, body } = parseSkillMarkdown(raw);
        const dirPath = path.dirname(file);
        const entry = {
          name: frontmatter.name,
          description: frontmatter.description || '',
          runtime: frontmatter.runtime || null,
          entrypoint: frontmatter.entrypoint || null,
          version: frontmatter.version || '0.0.0',
          license: frontmatter.license || 'unspecified',
          mimeType: frontmatter.mimeType || null,
          outputExt: frontmatter.outputExt || null,
          tools: Array.isArray(frontmatter.tools) ? frontmatter.tools : [],
          tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
          timeoutMs: Number.isFinite(frontmatter.timeoutMs) ? frontmatter.timeoutMs : null,
          allowNetwork: !!frontmatter.allowNetwork,
          requiresInput: !!frontmatter.requiresInput,
          body,
          dirPath,
          file,
          frontmatter,
        };
        const errs = _validateSkill(entry);
        if (!errs.length && !_registry.has(entry.name)) _registry.set(entry.name, entry);
      } catch { /* skip broken skill */ }
    }
    _loadedFrom = DEFAULT_DIR;
    _loadedAt = Date.now();
  } catch { /* noop */ }
}

function getSkill(name) {
  _autoloadSync();
  return _registry.get(String(name)) || null;
}

function listSkills(filter = {}) {
  _autoloadSync();
  const { runtime, tag, query } = filter;
  const q = query ? String(query).toLowerCase() : null;
  const out = [];
  for (const s of _registry.values()) {
    if (runtime && s.runtime !== runtime) continue;
    if (tag && !s.tags.includes(tag)) continue;
    if (q) {
      const hay = `${s.name} ${s.description} ${(s.tags || []).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    out.push({
      name: s.name,
      description: s.description,
      runtime: s.runtime,
      version: s.version,
      tags: s.tags,
      mimeType: s.mimeType,
      outputExt: s.outputExt,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

async function reload(dir = _loadedFrom || DEFAULT_DIR) {
  return loadSkills(dir);
}

function getRegistryStats() {
  _autoloadSync();
  return {
    count: _registry.size,
    loadedFrom: _loadedFrom,
    loadedAt: _loadedAt,
    errors: [..._errors],
  };
}

module.exports = {
  loadSkills,
  reload,
  getSkill,
  listSkills,
  parseSkillMarkdown,
  getRegistryStats,
  DEFAULT_DIR,
};
