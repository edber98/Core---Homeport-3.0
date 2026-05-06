// Skill Executor — runs a SKILL.md-declared skill inside the sandbox.
// Complements `skill-runner.js` (which uses the legacy SKILL_BUNDLE map). The
// executor is SKILL.md-driven: everything needed to run a skill lives in its
// frontmatter (`runtime`, `entrypoint`, `mimeType`, `timeoutMs`, `allowNetwork`).

const os = require('os');
const path = require('path');
const fsp = require('fs/promises');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');

const { getSkill } = require('./skill-loader');
const { createFilesHelper } = require('../../services/file-storage');

let sandbox = null;
try { sandbox = require('../sandbox'); } catch { sandbox = null; }

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_STDIN_BYTES = 1 * 1024 * 1024;
const MAX_INPUT_FILES = 10;
const MAX_INPUT_TOTAL_BYTES = 50 * 1024 * 1024;

function _cmdForRuntime(runtime, entrypoint) {
  switch (runtime) {
    case 'python': return ['python3', entrypoint];
    case 'node':   return ['node', entrypoint];
    case 'shell':  return ['sh', entrypoint];
    default:
      throw new Error(`unsupported_runtime:${runtime}`);
  }
}

/**
 * Execute a skill declared by a SKILL.md frontmatter.
 *
 * @param {object}   opts
 * @param {string}   opts.skillName    - `name` field from frontmatter
 * @param {object}   opts.input        - JSON spec fed to stdin
 * @param {Array}    [opts.inputFiles] - [{ path, fileId }] staged into /workspace/in/<path>
 * @param {string}   opts.workspaceId
 * @param {string}   [opts.companyId]
 * @param {string}   [opts.threadId]
 * @param {string}   [opts.uploadedBy]
 * @param {function} [opts.emit]       - side-event emitter (canvas.task.update)
 * @param {number}   [opts.timeoutMs]
 */
async function executeSkill(opts = {}) {
  const {
    skillName,
    input,
    inputFiles = [],
    workspaceId,
    companyId,
    threadId,
    uploadedBy,
    emit,
    timeoutMs,
  } = opts;

  const skill = getSkill(skillName);
  if (!skill) throw new Error(`unknown_skill:${skillName}`);
  if (!skill.entrypoint) throw new Error(`skill_has_no_entrypoint:${skillName}`);
  if (!skill.runtime) throw new Error(`skill_has_no_runtime:${skillName}`);
  if (!workspaceId) throw new Error('missing_workspace_id');
  if (!sandbox) throw new Error('sandbox_unavailable');
  if (typeof sandbox.run !== 'function') throw new Error('sandbox_invalid');

  let stdin;
  try { stdin = JSON.stringify(input == null ? {} : input); }
  catch (e) { throw new Error(`spec_serialize_failed:${e.message}`); }
  if (Buffer.byteLength(stdin, 'utf8') > MAX_STDIN_BYTES) throw new Error('spec_too_large');

  if (!Array.isArray(inputFiles)) throw new Error('input_files_not_array');
  if (inputFiles.length > MAX_INPUT_FILES) throw new Error('too_many_input_files');

  const files = createFilesHelper({
    workspaceId,
    companyId: companyId || null,
    uploadedBy: uploadedBy || 'ai-agent',
  });

  const safeEmit = typeof emit === 'function' ? emit : () => {};
  const toolLabel = `skill:${skill.name}`;

  let stageDir = null;
  const stagedFilesIn = [];
  let totalInputBytes = 0;

  try {
    if (inputFiles.length) {
      stageDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'hp-skill-in-'));
      for (const f of inputFiles) {
        if (!f?.fileId || !f?.path) throw new Error('input_file_missing_fields');
        const { stream } = await files.resolve(f.fileId);
        const localName = path.basename(f.path);
        const localPath = path.join(stageDir, localName);
        await pipeline(stream, createWriteStream(localPath));
        const st = await fsp.stat(localPath);
        totalInputBytes += st.size;
        if (totalInputBytes > MAX_INPUT_TOTAL_BYTES) throw new Error('input_files_too_large');
        stagedFilesIn.push({ hostPath: localPath, name: localName });
      }
    }

    const cmd = _cmdForRuntime(skill.runtime, skill.entrypoint);
    const startedAt = Date.now();

    safeEmit({
      type: 'canvas.task.update',
      toolCalls: [{
        name: toolLabel, status: 'running', startedAt, finishedAt: null,
        argsSummary: skill.description || skill.name,
      }],
    });

    const result = await sandbox.run({
      language: skill.runtime === 'python' ? 'python' : 'node',
      code: '',
      stdin,
      filesIn: stagedFilesIn,
      timeoutMs: Number.isFinite(timeoutMs)
        ? timeoutMs
        : (Number.isFinite(skill.timeoutMs) ? skill.timeoutMs : DEFAULT_TIMEOUT_MS),
      allowNetwork: !!skill.allowNetwork,
      cmdOverride: cmd,
    });

    const finishedAt = Date.now();

    if (result.timedOut) {
      safeEmit({
        type: 'canvas.task.update',
        toolCalls: [{ name: toolLabel, status: 'timeout', startedAt, finishedAt }],
      });
      const err = new Error(`skill_timeout:${skill.name}`);
      err.stderr = result.stderr || '';
      throw err;
    }

    if (result.exitCode !== 0) {
      safeEmit({
        type: 'canvas.task.update',
        toolCalls: [{ name: toolLabel, status: 'failed', startedAt, finishedAt }],
      });
      const err = new Error(`skill_failed:${skill.name}`);
      err.stderr = result.stderr || '';
      err.stdout = result.stdout || '';
      err.exitCode = result.exitCode;
      throw err;
    }

    const outPath = String(result.stdout || '').trim().split('\n').filter(Boolean).pop() || '';
    const outName = outPath.replace(/^out\//, '').replace(/^\/+/, '');

    // When a skill has no file output, just return stdout.
    if (!outName) {
      safeEmit({
        type: 'canvas.task.update',
        toolCalls: [{ name: toolLabel, status: 'success', startedAt, finishedAt }],
      });
      return {
        ok: true,
        stdout: result.stdout,
        stderr: result.stderr,
        duration: result.duration,
        skillName: skill.name,
        noFileProduced: true,
      };
    }

    const produced = Array.isArray(result.producedFiles) ? result.producedFiles : [];
    let match = produced.find((pf) => (pf.path || '').replace(/^\/+/, '').replace(/^out\//, '') === outName);
    if (!match) match = produced.find((pf) => (pf.path || '').endsWith(outName));
    if (!match && produced.length === 1) match = produced[0];
    if (!match || !match.hostPath) {
      const err = new Error('skill_no_output_file');
      err.stderr = result.stderr || '';
      err.stdout = result.stdout || '';
      throw err;
    }

    const mimeType = skill.mimeType || 'application/octet-stream';
    const displayName = path.basename(match.path || outName);

    const stored = await files.store(createReadStream(match.hostPath), {
      name: displayName,
      mimeType,
      lifecycle: 'execution',
    });

    safeEmit({
      type: 'canvas.task.update',
      toolCalls: [{ name: toolLabel, status: 'success', startedAt, finishedAt }],
    });

    return {
      ok: true,
      fileId: stored.fileId,
      name: stored.name,
      size: stored.size,
      mimeType: stored.mimeType || mimeType,
      stdout: result.stdout,
      stderr: result.stderr,
      duration: result.duration,
      skillName: skill.name,
      threadId: threadId || null,
    };
  } finally {
    if (stageDir) {
      try { await fsp.rm(stageDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }
}

module.exports = { executeSkill };
