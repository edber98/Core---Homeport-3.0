// Code execution tools — exposent `execute_code` et `prepare_code_environment`
// à l'agent IA. Télécharge les fichiers d'entrée depuis le file-storage, délègue
// l'exécution à la sandbox, puis ré-upload les fichiers produits.

const os = require('os');
const path = require('path');
const fsp = require('fs/promises');
const { createWriteStream, createReadStream } = require('fs');
const { pipeline } = require('stream/promises');

const sandbox = require('../sandbox');
const { createFilesHelper } = require('../../services/file-storage');

// Limites d'entrée (côté tool, avant appel sandbox)
const MAX_CODE_BYTES = 50 * 1024;              // 50 Ko
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;
const MAX_INPUT_FILES = 10;
const MAX_INPUT_TOTAL_BYTES = 50 * 1024 * 1024; // 50 Mo cumulés

// Listes indicatives de packages pré-installés dans l'image Docker.
// Utilisées par `prepare_code_environment` pour renseigner l'agent.
const PREINSTALLED_PYTHON = [
  'python-docx', 'python-pptx', 'openpyxl', 'pandas', 'python-dateutil',
  'requests', 'beautifulsoup4', 'lxml', 'Pillow', 'pypdf', 'readability-lxml',
  'matplotlib', 'seaborn',
];
const PREINSTALLED_NODE = [
  'date-fns', 'csv-parse', 'xlsx', 'mammoth', 'cheerio', 'turndown', 'undici',
  '@mozilla/readability',
];

const CODE_EXEC_TOOL_DEFINITIONS = [
  {
    name: 'execute_code',
    description: 'Exécute du code Python ou Node.js dans une sandbox isolée. Supporte stdin, fichiers d\'entrée (via fileId) montés dans /workspace/in/, et récupère les fichiers produits dans /workspace/out/. IMPORTANT : pour écrire, crée toujours le dossier avec os.makedirs("/workspace/out", exist_ok=True) ou utilise Path(os.environ["WORKSPACE_OUT"]) si défini. Timeout configurable (1s à 120s).',
    parameters: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['python', 'node'], description: 'Langage d\'exécution' },
        code: { type: 'string', description: 'Code source (max 50 Ko)' },
        stdin: { type: 'string', description: 'Entrée standard à fournir au script' },
        files: {
          type: 'array',
          description: 'Fichiers d\'entrée (montés dans /workspace/in/<path>). Max 10 fichiers, 50 Mo cumulés.',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Nom du fichier à l\'intérieur de /workspace/in' },
              fileId: { type: 'string', description: 'fileId récupéré via le file-storage Homeport' },
            },
            required: ['path', 'fileId'],
          },
        },
        timeoutMs: { type: 'number', description: 'Timeout wallclock en ms (défaut 30000, min 1000, max 120000)' },
        allowNetwork: { type: 'boolean', description: 'Autorise l\'accès réseau (défaut false). DÉCONSEILLÉ sauf nécessité explicite.' },
      },
      required: ['language', 'code'],
    },
  },
  {
    name: 'prepare_code_environment',
    description: 'Liste les packages pré-installés disponibles pour un langage donné. N\'installe rien dynamiquement — retourne seulement l\'état de l\'image sandbox.',
    parameters: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['python', 'node'], description: 'Langage à inspecter' },
        packages: {
          type: 'array',
          items: { type: 'string' },
          description: 'Liste de packages à vérifier (optionnel). Répond avec installed/missing.',
        },
      },
      required: ['language'],
    },
  },
];

/** Utilitaire : mime grossier basé sur l'extension du fichier produit. */
function guessMimeType(filename) {
  const ext = (path.extname(filename) || '').toLowerCase();
  const map = {
    '.txt': 'text/plain', '.csv': 'text/csv', '.json': 'application/json',
    '.html': 'text/html', '.xml': 'application/xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip': 'application/zip',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * Crée un exécuteur pour les tools d'exécution de code.
 * @param {object} metadata - { workspaceId, companyId, threadId?, runId?, uploadedBy? }
 * @param {function} emit - Callback pour événements (canvas.task.update, etc.)
 */
function createCodeExecExecutor(metadata, emit) {
  const files = createFilesHelper({
    workspaceId: metadata.workspaceId,
    companyId: metadata.companyId,
    runId: metadata.runId || null,
    uploadedBy: metadata.uploadedBy || 'ai-agent',
  });

  const safeEmit = typeof emit === 'function' ? emit : () => {};

  async function executeCode(input) {
    const {
      language,
      code,
      stdin,
      files: inputFiles = [],
      timeoutMs,
      allowNetwork = false,
    } = input || {};

    // 1. Validations
    if (language !== 'python' && language !== 'node') {
      return { success: false, error: `language invalide : "${language}" (attendu python|node)` };
    }
    if (typeof code !== 'string' || !code.length) {
      return { success: false, error: 'code manquant' };
    }
    const codeBytes = Buffer.byteLength(code, 'utf8');
    if (codeBytes > MAX_CODE_BYTES) {
      return { success: false, error: `code trop volumineux : ${codeBytes} > ${MAX_CODE_BYTES} octets` };
    }
    let effectiveTimeout = 30_000;
    if (timeoutMs != null) {
      const n = Number(timeoutMs);
      if (!Number.isFinite(n)) return { success: false, error: 'timeoutMs doit être un nombre' };
      if (n < MIN_TIMEOUT_MS || n > MAX_TIMEOUT_MS) {
        return { success: false, error: `timeoutMs hors bornes (${MIN_TIMEOUT_MS}..${MAX_TIMEOUT_MS})` };
      }
      effectiveTimeout = n;
    }
    if (!Array.isArray(inputFiles)) {
      return { success: false, error: 'files doit être un tableau' };
    }
    if (inputFiles.length > MAX_INPUT_FILES) {
      return { success: false, error: `trop de fichiers en entrée (max ${MAX_INPUT_FILES})` };
    }

    const startedAt = Date.now();
    const argsSummary = `${language} ${String(code).slice(0, 80)}${code.length > 80 ? '...' : ''}`;

    // Signal "started"
    safeEmit({
      type: 'canvas.task.update',
      toolCalls: [{
        name: 'execute_code',
        status: 'running',
        startedAt,
        finishedAt: null,
        argsSummary,
      }],
    });

    // 2. Télécharge les fichiers d'entrée dans un dir temporaire
    let stageDir = null;
    const filesIn = [];
    let totalInputBytes = 0;

    try {
      if (inputFiles.length) {
        stageDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'sbx-in-'));
        for (const f of inputFiles) {
          if (!f?.fileId || !f?.path) {
            return { success: false, error: 'chaque fichier doit avoir { path, fileId }' };
          }
          const { stream, record } = await files.resolve(f.fileId);
          const localName = path.basename(f.path);
          const localPath = path.join(stageDir, localName);
          await pipeline(stream, createWriteStream(localPath));
          const st = await fsp.stat(localPath);
          totalInputBytes += st.size;
          if (totalInputBytes > MAX_INPUT_TOTAL_BYTES) {
            return { success: false, error: `total des fichiers d'entrée > ${MAX_INPUT_TOTAL_BYTES} octets` };
          }
          filesIn.push({ hostPath: localPath, name: f.path, originalRecord: record });
        }
      }

      // 3. Appel sandbox
      const result = await sandbox.run({
        language,
        code,
        stdin: typeof stdin === 'string' ? stdin : undefined,
        timeoutMs: effectiveTimeout,
        allowNetwork: !!allowNetwork,
        filesIn: filesIn.map((f) => ({ hostPath: f.hostPath, name: f.name })),
      });

      // 4. Upload des fichiers produits
      const producedFiles = [];
      for (const pf of (result.producedFiles || [])) {
        try {
          const name = path.basename(pf.path);
          const stream = createReadStream(pf.hostPath);
          const ref = await files.store(stream, {
            name,
            mimeType: guessMimeType(name),
            lifecycle: 'execution',
          });
          producedFiles.push({ path: pf.path, fileId: ref.fileId, size: pf.size });
        } catch (err) {
          producedFiles.push({ path: pf.path, error: err?.message || String(err), size: pf.size });
        } finally {
          // nettoyage du fichier stagé
          try { await fsp.rm(pf.hostPath, { force: true }); } catch { /* ignore */ }
        }
      }

      const finishedAt = Date.now();

      // Signal "done"
      safeEmit({
        type: 'canvas.task.update',
        toolCalls: [{
          name: 'execute_code',
          status: result.timedOut ? 'timeout' : (result.exitCode === 0 ? 'success' : 'failed'),
          startedAt,
          finishedAt,
          argsSummary,
        }],
      });

      const response = {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        duration: result.duration,
        producedFiles,
        timedOut: !!result.timedOut,
        backend: sandbox.getBackend(),
      };
      if (allowNetwork) {
        response.warning = 'Réseau autorisé — l\'isolation est réduite. À n\'utiliser que si strictement nécessaire.';
      }
      return response;
    } catch (err) {
      safeEmit({
        type: 'canvas.task.update',
        toolCalls: [{
          name: 'execute_code',
          status: 'failed',
          startedAt,
          finishedAt: Date.now(),
          argsSummary,
        }],
      });
      return { success: false, error: err?.message || String(err) };
    } finally {
      if (stageDir) {
        try { await fsp.rm(stageDir, { recursive: true, force: true }); } catch { /* ignore */ }
      }
    }
  }

  function prepareEnvironment(input) {
    const { language, packages } = input || {};
    if (language !== 'python' && language !== 'node') {
      return { available: false, installed: [], missing: [], error: `language invalide : "${language}"` };
    }
    const preset = language === 'python' ? PREINSTALLED_PYTHON : PREINSTALLED_NODE;
    const lowerPreset = new Set(preset.map((p) => p.toLowerCase()));

    if (!Array.isArray(packages) || packages.length === 0) {
      return { available: true, installed: preset, missing: [] };
    }
    const installed = [];
    const missing = [];
    for (const pkg of packages) {
      if (typeof pkg !== 'string') continue;
      if (lowerPreset.has(pkg.toLowerCase())) installed.push(pkg);
      else missing.push(pkg);
    }
    return { available: true, installed, missing };
  }

  const tools = {
    execute_code: executeCode,
    prepare_code_environment: prepareEnvironment,
  };

  return {
    definitions: CODE_EXEC_TOOL_DEFINITIONS,
    canHandle(name) { return name in tools; },
    async execute(name, input) {
      if (!(name in tools)) throw new Error(`Unknown code-exec tool: ${name}`);
      try {
        return await tools[name](input || {});
      } catch (err) {
        return { success: false, error: err?.message || String(err) };
      }
    },
    async cleanup() { /* rien à persister */ },
  };
}

module.exports = {
  CODE_EXEC_TOOL_DEFINITIONS,
  createCodeExecExecutor,
};
