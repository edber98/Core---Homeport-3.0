// Skills bootstrap — called once at server start. Loads all SKILL.md files,
// checks runtime availability (Python, Node, pptxgenjs, python-pptx…) and logs
// warnings if something is missing. Non-fatal by design: the server must boot
// even when the sandbox or some libraries are not present on the dev machine.

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { loadSkills, getRegistryStats } = require('./skill-loader');

function _check(cmd, args, { parseVersion = null } = {}) {
  try {
    const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 5000 });
    if (r.status === 0) {
      const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
      const version = parseVersion ? parseVersion(out) : out;
      return { ok: true, version };
    }
    return { ok: false, error: r.stderr || r.stdout || `exit:${r.status}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function _parseSemver(s) {
  const m = String(s || '').match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  return m ? { major: +m[1], minor: +m[2], patch: +(m[3] || 0), raw: m[0] } : null;
}

function _checkNodeModule(pkg) {
  try {
    require.resolve(pkg);
    return { ok: true };
  } catch {
    // Fall back: maybe installed globally and not visible from require() path.
    const r = spawnSync('node', ['-e', `require('${pkg}')`], { encoding: 'utf8', timeout: 5000 });
    return r.status === 0 ? { ok: true, global: true } : { ok: false };
  }
}

function _checkPythonModule(mod) {
  const r = spawnSync('python3', ['-c', `import ${mod}`], { encoding: 'utf8', timeout: 5000 });
  return r.status === 0 ? { ok: true } : { ok: false, error: (r.stderr || '').trim() };
}

async function initSkills(dir) {
  const report = { ok: true, skills: null, runtimes: {}, warnings: [] };

  // 1) Load SKILL.md registry
  try {
    const { count, errors } = await loadSkills(dir);
    report.skills = { count, errors };
    if (errors.length) {
      report.warnings.push(`[skills] ${errors.length} SKILL.md failed to load`);
      for (const err of errors) {
        // eslint-disable-next-line no-console
        console.warn(`[skills] load error (${err.file}): ${err.error}`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`[skills] loaded ${count} SKILL.md from ${getRegistryStats().loadedFrom}`);
  } catch (e) {
    report.ok = false;
    report.warnings.push(`[skills] registry load failed: ${e.message}`);
    // eslint-disable-next-line no-console
    console.warn(`[skills] registry load failed: ${e.message}`);
  }

  // 2) Runtime sniffing (best-effort, never throws)
  const node = _check('node', ['--version']);
  report.runtimes.node = node;
  if (node.ok) {
    const v = _parseSemver(node.version);
    if (!v || v.major < 18) {
      report.warnings.push(`[skills] node ${node.version} < 18 required`);
    }
  } else {
    report.warnings.push('[skills] node not found in PATH');
  }

  const py = _check('python3', ['--version']);
  report.runtimes.python3 = py;
  if (py.ok) {
    const v = _parseSemver(py.version);
    if (!v || v.major < 3 || (v.major === 3 && v.minor < 10)) {
      report.warnings.push(`[skills] python3 ${py.version} < 3.10`);
    }
  } else {
    report.warnings.push('[skills] python3 not found in PATH');
  }

  // 3) Python modules
  const pyMods = ['docx', 'pptx', 'openpyxl', 'PIL', 'pandas', 'dateutil'];
  for (const m of pyMods) {
    const c = _checkPythonModule(m);
    report.runtimes[`py:${m}`] = c;
    if (!c.ok) report.warnings.push(`[skills] python module missing: ${m}`);
  }

  // 4) Node modules (pptxgenjs is the important one for the new designed skill)
  const nodeMods = ['pptxgenjs', 'archiver', 'jsdom'];
  for (const m of nodeMods) {
    const c = _checkNodeModule(m);
    report.runtimes[`node:${m}`] = c;
    if (!c.ok) report.warnings.push(`[skills] node module missing: ${m}`);
  }

  // 5) Sandbox hint
  try {
    const sandbox = require('../sandbox');
    if (sandbox && typeof sandbox.init === 'function') {
      report.runtimes.sandbox = { ok: true };
    } else {
      report.warnings.push('[skills] sandbox module unavailable');
    }
  } catch (e) {
    report.warnings.push(`[skills] sandbox require failed: ${e.message}`);
  }

  return report;
}

module.exports = { initSkills };
