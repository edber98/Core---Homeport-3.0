// Mapping skillKey -> sandbox command + output metadata.
// Two sources are merged at require-time :
//   1. The legacy hard-coded SKILL_BUNDLE map below (kept for backward
//      compatibility with existing callers of `runSkill`).
//   2. Every SKILL.md found by `skill-loader` (dynamic, preferred going forward).
//
// Each entry:
//   cmd:         argv to run inside the sandbox; first token is runtime hint
//   outputExt:   extension produced by the script (preview / MIME routing)
//   mimeType:    returned to the caller once file is stored
//   label:       human description used in the canvas panel

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const LEGACY_SKILL_BUNDLE = {
  'docx-create': {
    cmd: ['python3', '/app/skills-bundle/docx/create.py'],
    outputExt: 'docx',
    mimeType: DOCX_MIME,
    label: 'Créer un document Word',
  },
  'docx-edit': {
    cmd: ['python3', '/app/skills-bundle/docx/edit.py'],
    outputExt: 'docx',
    mimeType: DOCX_MIME,
    label: 'Modifier un document Word',
    requiresInput: true,
  },
  'pptx-create': {
    cmd: ['python3', '/app/skills-bundle/pptx/create.py'],
    outputExt: 'pptx',
    mimeType: PPTX_MIME,
    label: 'Créer une présentation PowerPoint',
  },
  'pptx-designed': {
    cmd: ['node', '/app/skills-bundle/pptx/pptxgenjs.mjs'],
    outputExt: 'pptx',
    mimeType: PPTX_MIME,
    label: 'Créer une présentation PowerPoint (design moderne)',
  },
  'xlsx-create': {
    cmd: ['python3', '/app/skills-bundle/xlsx/create.py'],
    outputExt: 'xlsx',
    mimeType: XLSX_MIME,
    label: 'Créer un classeur Excel',
  },
  'frontend-html': {
    cmd: ['node', '/app/skills-bundle/frontend-design/build.mjs'],
    outputExt: 'html',
    mimeType: 'text/html',
    label: 'Générer une page HTML',
  },
  'webapp-bundle': {
    cmd: ['node', '/app/skills-bundle/web-artifacts-builder/build.mjs'],
    outputExt: 'zip',
    mimeType: 'application/zip',
    label: 'Construire un site web (zip)',
  },
};

let _loader = null;
try { _loader = require('./skill-loader'); } catch { _loader = null; }

/**
 * Build the effective registry: SKILL.md entries override legacy ones with
 * the same `name`, but legacy entries stay available if no SKILL.md exists
 * yet for them.
 */
function _buildMerged() {
  const merged = { ...LEGACY_SKILL_BUNDLE };
  if (!_loader) return merged;
  try {
    const all = _loader.listSkills();
    for (const meta of all) {
      const full = _loader.getSkill(meta.name);
      if (!full) continue;
      if (!full.runtime || !full.entrypoint) continue;
      const cmd = full.runtime === 'python'
        ? ['python3', full.entrypoint]
        : full.runtime === 'node'
          ? ['node', full.entrypoint]
          : ['sh', full.entrypoint];
      merged[full.name] = {
        cmd,
        outputExt: full.outputExt || merged[full.name]?.outputExt || null,
        mimeType: full.mimeType || merged[full.name]?.mimeType || null,
        label: full.description || merged[full.name]?.label || full.name,
        requiresInput: !!full.requiresInput,
        source: 'SKILL.md',
      };
    }
  } catch { /* keep legacy only */ }
  return merged;
}

// Proxy so callers always see the freshest merged registry (hot-reload friendly).
const SKILL_BUNDLE = new Proxy({}, {
  ownKeys() { return Reflect.ownKeys(_buildMerged()); },
  getOwnPropertyDescriptor(_, key) {
    const merged = _buildMerged();
    return Object.prototype.hasOwnProperty.call(merged, key)
      ? { configurable: true, enumerable: true, writable: false, value: merged[key] }
      : undefined;
  },
  has(_, key) { return Object.prototype.hasOwnProperty.call(_buildMerged(), key); },
  get(_, key) { return _buildMerged()[key]; },
});

module.exports = { SKILL_BUNDLE, LEGACY_SKILL_BUNDLE };
