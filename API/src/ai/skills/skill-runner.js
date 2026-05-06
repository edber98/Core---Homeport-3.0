// Skill runner — execute a Homeport skill-bundle script in the sandbox, upload
// the produced file to the file-storage, and return a fileRef-like descriptor.
//
// Responsibilities:
//   - Resolve input fileRefs → stage them locally for sandbox filesIn
//   - Run the bundled script via `sandbox.run({ cmdOverride })`
//   - Parse stdout for the produced relative path ("out/<name>.<ext>")
//   - Store the produced file in the workspace file-storage with the right mime

const os = require('os');
const path = require('path');
const fsp = require('fs/promises');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');

const { SKILL_BUNDLE } = require('./bundle-index');
const { createFilesHelper } = require('../../services/file-storage');

// Sandbox is optional at require-time so that unit tests can load this module.
let sandbox = null;
try {
  sandbox = require('../sandbox');
} catch (_) {
  sandbox = null;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_STDIN_BYTES = 1 * 1024 * 1024;           // 1 MB JSON spec max
const MAX_INPUT_FILES = 10;
const MAX_INPUT_TOTAL_BYTES = 50 * 1024 * 1024;

function listSkills() {
  return Object.keys(SKILL_BUNDLE);
}

function describeSkill(skillKey) {
  return SKILL_BUNDLE[skillKey] || null;
}

/**
 * Execute a skill.
 *
 * @param {object}   opts
 * @param {string}   opts.skillKey     - Key from SKILL_BUNDLE
 * @param {object}   opts.spec         - JSON spec fed to stdin
 * @param {Array}    [opts.inputFiles] - [{ path, fileId }] staged into /workspace/in/<path>
 * @param {string}   opts.workspaceId
 * @param {string}   [opts.companyId]
 * @param {string}   [opts.threadId]
 * @param {string}   [opts.uploadedBy]
 * @param {function} [opts.emit]       - Side-event emitter (canvas.* events)
 * @param {number}   [opts.timeoutMs]
 * @returns {Promise<{fileId, name, size, mimeType, stdout, stderr, duration}>}
 */
async function runSkill(opts = {}) {
  const {
    skillKey,
    spec,
    inputFiles = [],
    workspaceId,
    companyId,
    threadId,
    uploadedBy,
    emit,
    timeoutMs,
  } = opts;

  const entry = SKILL_BUNDLE[skillKey];
  if (!entry) throw new Error(`unknown_skill:${skillKey}`);
  if (!workspaceId) throw new Error('missing_workspace_id');
  if (!sandbox) throw new Error('sandbox_unavailable');
  if (typeof sandbox.run !== 'function') throw new Error('sandbox_invalid');

  // Serialize spec
  let stdin;
  try {
    stdin = JSON.stringify(spec == null ? {} : spec);
  } catch (e) {
    throw new Error(`spec_serialize_failed:${e.message}`);
  }
  if (Buffer.byteLength(stdin, 'utf8') > MAX_STDIN_BYTES) {
    throw new Error('spec_too_large');
  }

  if (!Array.isArray(inputFiles)) throw new Error('input_files_not_array');
  if (inputFiles.length > MAX_INPUT_FILES) throw new Error('too_many_input_files');

  const files = createFilesHelper({
    workspaceId,
    companyId: companyId || null,
    uploadedBy: uploadedBy || 'ai-agent',
  });

  const safeEmit = typeof emit === 'function' ? emit : () => {};

  // Stage input files to /tmp for bubblewrap to pick up as /workspace/in/<name>
  let stageDir = null;
  const stagedFilesIn = [];
  let totalInputBytes = 0;

  try {
    if (inputFiles.length) {
      stageDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'hp-skill-in-'));
      for (const f of inputFiles) {
        if (!f?.fileId || !f?.path) {
          throw new Error('input_file_missing_fields');
        }
        const { stream } = await files.resolve(f.fileId);
        const localName = path.basename(f.path);
        const localPath = path.join(stageDir, localName);
        await pipeline(stream, createWriteStream(localPath));
        const st = await fsp.stat(localPath);
        totalInputBytes += st.size;
        if (totalInputBytes > MAX_INPUT_TOTAL_BYTES) {
          throw new Error('input_files_too_large');
        }
        stagedFilesIn.push({ hostPath: localPath, name: localName });
      }
    }

    const startedAt = Date.now();

    safeEmit({
      type: 'canvas.task.update',
      toolCalls: [{
        name: `skill:${skillKey}`,
        status: 'running',
        startedAt,
        finishedAt: null,
        argsSummary: entry.label || skillKey,
      }],
    });

    const result = await sandbox.run({
      language: entry.cmd[0].includes('python') ? 'python' : 'node',
      code: '',              // ignored — script already lives in the sandbox image
      stdin,
      filesIn: stagedFilesIn,
      timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
      allowNetwork: false,
      cmdOverride: entry.cmd,
    });

    const finishedAt = Date.now();

    if (result.timedOut) {
      safeEmit({
        type: 'canvas.task.update',
        toolCalls: [{
          name: `skill:${skillKey}`, status: 'timeout',
          startedAt, finishedAt, argsSummary: entry.label || skillKey,
        }],
      });
      const err = new Error(`skill_timeout:${skillKey}`);
      err.stderr = result.stderr || '';
      throw err;
    }

    if (result.exitCode !== 0) {
      safeEmit({
        type: 'canvas.task.update',
        toolCalls: [{
          name: `skill:${skillKey}`, status: 'failed',
          startedAt, finishedAt, argsSummary: entry.label || skillKey,
        }],
      });
      const err = new Error(`skill_failed:${skillKey}`);
      err.stderr = result.stderr || '';
      err.stdout = result.stdout || '';
      err.exitCode = result.exitCode;
      throw err;
    }

    // Parse stdout to get the produced file path (e.g. "out/my-doc.docx").
    const outPath = String(result.stdout || '').trim().split('\n').filter(Boolean).pop() || '';
    const outName = outPath.replace(/^out\//, '').replace(/^\/+/, '');
    if (!outName) {
      const err = new Error('skill_no_output_path');
      err.stderr = result.stderr || '';
      throw err;
    }

    // Match against sandbox's producedFiles list (most reliable).
    const produced = Array.isArray(result.producedFiles) ? result.producedFiles : [];
    // Prefer an exact match on the trailing relative path, fallback on suffix.
    let match = produced.find(pf => (pf.path || '').replace(/^\/+/, '').replace(/^out\//, '') === outName);
    if (!match) {
      match = produced.find(pf => (pf.path || '').endsWith(outName));
    }
    if (!match) {
      // Last resort: when sandbox surfaces only a single file, use it.
      if (produced.length === 1) match = produced[0];
    }
    if (!match || !match.hostPath) {
      const err = new Error('skill_no_output_file');
      err.stderr = result.stderr || '';
      err.stdout = result.stdout || '';
      throw err;
    }

    const mimeType = entry.mimeType || 'application/octet-stream';
    const displayName = path.basename(match.path || outName);

    const stored = await files.store(createReadStream(match.hostPath), {
      name: displayName,
      mimeType,
      lifecycle: 'execution',
    });

    safeEmit({
      type: 'canvas.task.update',
      toolCalls: [{
        name: `skill:${skillKey}`, status: 'success',
        startedAt, finishedAt, argsSummary: entry.label || skillKey,
      }],
    });

    return {
      fileId: stored.fileId,
      name: stored.name,
      size: stored.size,
      mimeType: stored.mimeType || mimeType,
      stdout: result.stdout,
      stderr: result.stderr,
      duration: result.duration,
      skillKey,
      threadId: threadId || null,
    };
  } finally {
    if (stageDir) {
      try { await fsp.rm(stageDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }
}

module.exports = { runSkill, listSkills, describeSkill, SKILL_BUNDLE };
