// Document tools — expose high-level "generate a document" capabilities to the
// AI agent. Delegates the actual work to the Homeport skills-bundle via
// `skill-runner`, which in turn invokes the sandbox.
//
// Tools:
//   - generate_document   (docx | pptx | xlsx | html)
//   - edit_document       (docx only for now)
//   - render_html_preview (inline HTML → sanitized preview for canvas)
//   - build_website       (multi-page HTML bundle, returns a .zip)

const { runSkill, SKILL_BUNDLE } = require('../skills/skill-runner');

const DOCUMENT_TOOL_DEFINITIONS = [
  {
    name: 'generate_document',
    description: `Génère un document .docx/.pptx/.xlsx/.html depuis un spec JSON. Le paramètre **spec est OBLIGATOIRE** — sans lui, erreur \`missing_spec\`.

🔴 IMPORTANT : pour les documents complexes (mise en page, styles custom, charte graphique), PRÉFÈRE \`execute_code\` avec python-docx/openpyxl/pptxgenjs — bien plus souple que ce tool. Ce tool est surtout utile pour des livrables simples et rapides.

📋 FORMAT DU SPEC (obligatoire)
\`\`\`
// docx
spec: {
  paragraphs: [
    { heading: 1, text: "Titre principal" },
    { heading: 2, text: "Sous-titre" },
    { text: "Paragraphe normal avec contenu." },
    { text: "Texte en gras", bold: true },
    { bullets: ["point 1", "point 2"] },
    { table: {
        headers: ["Col1", "Col2"],
        rows: [["a1","b1"], ["a2","b2"]]
    }}
  ]
}

// xlsx
spec: {
  sheets: [
    { name: "Data", headers: ["Nom","Site"], rows: [["n8n","https://n8n.io"],...] }
  ]
}

// pptx
spec: {
  slides: [
    { title: "Slide 1", bullets: ["point a","point b"] },
    { title: "Image", image: { fileId: "fx_xxx" } }
  ]
}

// html
spec: {
  pages: [
    { name: "index.html", title: "Accueil", content: "<h1>...</h1>" }
  ]
}
\`\`\`

🚫 NE JAMAIS appeler ce tool sans fournir spec complet. Si tu n'as pas la structure, utilise plutôt execute_code.`,
    parameters: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['docx', 'pptx', 'xlsx', 'html'],
          description: "Type de document à produire.",
        },
        title: {
          type: 'string',
          description: "Titre du document (sert aussi à nommer le fichier produit).",
        },
        spec: {
          type: 'object',
          description:
            "OBLIGATOIRE. Structure JSON du document. Voir description du tool pour les schémas par format (paragraphs pour docx, sheets pour xlsx, slides pour pptx, pages pour html). Ne JAMAIS omettre ce paramètre.",
        },
        inputFiles: {
          type: 'array',
          description:
            "Fichiers d'entrée à mettre à disposition du script (images embed, etc.). Chaque item = { path, fileId }.",
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              fileId: { type: 'string' },
            },
            required: ['path', 'fileId'],
          },
        },
      },
      required: ['format', 'title', 'spec'],
    },
  },
  {
    name: 'edit_document',
    description:
      "Modifie un document .docx existant (via fileId) avec une liste d'edits (replace_text, append_paragraph, insert_after, set_heading). Produit un nouveau fichier.",
    parameters: {
      type: 'object',
      properties: {
        sourceFileId: {
          type: 'string',
          description: "fileId du document source (.docx).",
        },
        sourceFileName: {
          type: 'string',
          description:
            "Nom de fichier utilisé dans /workspace/in (facultatif, sinon dérivé de sourceFileId).",
        },
        outputTitle: {
          type: 'string',
          description: "Titre/nom du fichier produit (slug).",
        },
        edits: {
          type: 'array',
          description: 'Liste ordonnée d\'opérations à appliquer.',
          items: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['replace_text', 'append_paragraph', 'insert_after', 'set_heading'],
              },
              query: { type: 'string' },
              value: { type: 'string' },
              style: { type: 'string' },
              level: { type: 'number' },
            },
            required: ['action'],
          },
        },
      },
      required: ['sourceFileId', 'edits'],
    },
  },
  {
    name: 'render_html_preview',
    description:
      "Retourne une version sanitizée d'un extrait HTML pour un affichage inline (pas de script, pas d'event handlers inline). Utile pour prévisualiser un document sans l'enregistrer.",
    parameters: {
      type: 'object',
      properties: {
        html: { type: 'string', description: 'Extrait HTML à nettoyer.' },
        title: { type: 'string', description: 'Titre affiché (optionnel).' },
      },
      required: ['html'],
    },
  },
  {
    name: 'build_website',
    description:
      "Construit un site multi-pages (HTML+CSS+JS) et retourne un fichier .zip téléchargeable. Framework: 'vanilla' ou 'react-cdn'.",
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        theme: { type: 'string', enum: ['light', 'dark', 'brand'] },
        framework: { type: 'string', enum: ['vanilla', 'react-cdn'] },
        shared: {
          type: 'object',
          properties: {
            css: { type: 'string' },
            js: { type: 'string' },
          },
        },
        pages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              label: { type: 'string' },
              spec: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  html: { type: 'string' },
                  css: { type: 'string' },
                  js: { type: 'string' },
                },
              },
            },
            required: ['path'],
          },
        },
        assets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              content: { type: 'string' },
              encoding: { type: 'string', enum: ['utf8', 'base64'] },
            },
            required: ['path', 'content'],
          },
        },
      },
      required: ['title', 'pages'],
    },
  },
];

const FORMAT_TO_SKILL = {
  docx: 'docx-create',
  pptx: 'pptx-create',
  xlsx: 'xlsx-create',
  html: 'frontend-html',
};

const FORMAT_TO_ICON = {
  docx: 'file-word',
  pptx: 'file-ppt',
  xlsx: 'file-excel',
  html: 'html5',
};

function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  // Minimal sanitizer suitable for preview. For production rendering, prefer
  // a proper library (DOMPurify) on the frontend.
  let out = html;
  // Strip <script> blocks (with or without attrs).
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  // Strip <style> blocks to avoid leaking into parent preview (optional).
  // Kept for design flexibility — callers can add extra hardening.
  // out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  // Strip inline event handlers on* attributes.
  out = out.replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '');
  out = out.replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '');
  out = out.replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '');
  // Strip javascript: URLs.
  out = out.replace(/(href|src|action|formaction)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"');
  out = out.replace(/(href|src|action|formaction)\s*=\s*'\s*javascript:[^']*'/gi, "$1='#'");
  return out;
}

function summarizeSpec(format, spec) {
  try {
    if (format === 'docx') {
      const n = (spec.paragraphs?.length || 0) + (spec.blocks?.filter(b => b.type === 'paragraph').length || 0);
      const h = (spec.headings?.length || 0) + (spec.blocks?.filter(b => b.type === 'heading').length || 0);
      return `${h} titre(s), ${n} paragraphe(s)`;
    }
    if (format === 'pptx') return `${spec.slides?.length || 0} slide(s)`;
    if (format === 'xlsx') {
      const sheets = spec.sheets || [];
      const rows = sheets.reduce((a, s) => a + (s.rows?.length || 0), 0);
      return `${sheets.length} feuille(s), ${rows} ligne(s)`;
    }
    if (format === 'html') {
      if (Array.isArray(spec.pages)) return `${spec.pages.length} page(s)`;
      return 'page unique';
    }
  } catch (_) { /* ignore */ }
  return '';
}

function buildPlaceholderPreview(format, title) {
  const icon = FORMAT_TO_ICON[format] || 'file';
  return `<div class="hp-doc-preview" data-format="${format}" data-icon="${icon}">
<p><strong>${escapeHtml(title || 'Document')}</strong></p>
<p><em>Génération en cours…</em></p>
</div>`;
}

function buildDonePreview({ format, title, name, size, fileId }) {
  const sizeKb = size ? Math.max(1, Math.round(size / 1024)) : null;
  return `<div class="hp-doc-preview" data-format="${format}" data-file-id="${escapeHtml(fileId)}">
<p><strong>${escapeHtml(title || name || 'Document')}</strong></p>
<p>Fichier produit : <code>${escapeHtml(name || '')}</code>${sizeKb ? ` (${sizeKb} Ko)` : ''}</p>
</div>`;
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/**
 * Create an executor for the document tools.
 *
 * @param {object}   metadata - { workspaceId, companyId, threadId, uploadedBy }
 * @param {function} [emit]   - Side-event emitter (canvas.document.update/done).
 */
function createDocumentExecutor(metadata = {}, emit) {
  const safeEmit = typeof emit === 'function' ? emit : () => {};
  const defs = DOCUMENT_TOOL_DEFINITIONS;
  const names = new Set(defs.map((d) => d.name));

  async function generateDocument(args) {
    const { format, title, spec, inputFiles = [] } = args || {};
    if (!format || !FORMAT_TO_SKILL[format]) {
      return { success: false, error: `unsupported_format: ${format}` };
    }
    if (!title || typeof title !== 'string') {
      return { success: false, error: 'missing_title' };
    }
    if (!spec || typeof spec !== 'object') {
      return {
        success: false,
        error: 'missing_spec',
        message: `Le paramètre 'spec' est OBLIGATOIRE pour generate_document. Exemple minimal pour ${format} :\n` +
          (format === 'docx'
            ? `spec: { paragraphs: [{ heading: 1, text: "Titre" }, { text: "Paragraphe..." }] }`
            : format === 'xlsx'
              ? `spec: { sheets: [{ name: "Data", headers: ["Col1","Col2"], rows: [["a","b"]] }] }`
              : format === 'pptx'
                ? `spec: { slides: [{ title: "Slide 1", bullets: ["a","b"] }] }`
                : `spec: { pages: [{ name: "index.html", title: "Accueil", content: "<h1>...</h1>" }] }`) +
          `\n\n💡 ALTERNATIVE : pour plus de contrôle (mise en page, charte graphique), utilise execute_code avec ${format === 'docx' ? 'python-docx' : format === 'xlsx' ? 'openpyxl' : format === 'pptx' ? 'pptxgenjs' : 'HTML/CSS custom'} directement.`,
      };
    }

    const skillKey = FORMAT_TO_SKILL[format];

    // Emit "in-progress" canvas card.
    safeEmit({
      type: 'canvas.document.update',
      format,
      title,
      summary: summarizeSpec(format, spec),
      previewHtml: buildPlaceholderPreview(format, title),
    });

    try {
      const fullSpec = { ...spec };
      if (!fullSpec.title) fullSpec.title = title;

      const file = await runSkill({
        skillKey,
        spec: fullSpec,
        inputFiles,
        workspaceId: metadata.workspaceId,
        companyId: metadata.companyId,
        threadId: metadata.threadId,
        uploadedBy: metadata.uploadedBy,
        emit,
      });

      const previewHtml = buildDonePreview({
        format,
        title,
        name: file.name,
        size: file.size,
        fileId: file.fileId,
      });

      safeEmit({
        type: 'canvas.document.done',
        format,
        title,
        fileId: file.fileId,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        previewHtml,
      });

      return {
        success: true,
        format,
        fileId: file.fileId,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        previewHtml,
      };
    } catch (err) {
      safeEmit({
        type: 'canvas.document.error',
        format,
        title,
        error: err?.message || String(err),
      });
      return {
        success: false,
        error: err?.message || String(err),
        stderr: err?.stderr || null,
        skillKey,
      };
    }
  }

  async function editDocument(args) {
    const { sourceFileId, sourceFileName, outputTitle, edits } = args || {};
    if (!sourceFileId) return { success: false, error: 'missing_source_file_id' };
    if (!Array.isArray(edits) || edits.length === 0) return { success: false, error: 'missing_edits' };

    const name = sourceFileName || 'source.docx';

    safeEmit({
      type: 'canvas.document.update',
      format: 'docx',
      title: outputTitle || name,
      previewHtml: buildPlaceholderPreview('docx', outputTitle || name),
    });

    try {
      const file = await runSkill({
        skillKey: 'docx-edit',
        spec: { sourceFileName: name, outputTitle, edits },
        inputFiles: [{ path: name, fileId: sourceFileId }],
        workspaceId: metadata.workspaceId,
        companyId: metadata.companyId,
        threadId: metadata.threadId,
        uploadedBy: metadata.uploadedBy,
        emit,
      });

      const previewHtml = buildDonePreview({
        format: 'docx',
        title: outputTitle || file.name,
        name: file.name,
        size: file.size,
        fileId: file.fileId,
      });

      safeEmit({
        type: 'canvas.document.done',
        format: 'docx',
        title: outputTitle || file.name,
        fileId: file.fileId,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        previewHtml,
      });

      return {
        success: true,
        format: 'docx',
        fileId: file.fileId,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        previewHtml,
      };
    } catch (err) {
      safeEmit({
        type: 'canvas.document.error',
        format: 'docx',
        title: outputTitle || name,
        error: err?.message || String(err),
      });
      return { success: false, error: err?.message || String(err), stderr: err?.stderr || null };
    }
  }

  async function renderHtmlPreview(args) {
    const { html, title } = args || {};
    if (typeof html !== 'string') return { success: false, error: 'missing_html' };
    const sanitized = sanitizeHtml(html);
    safeEmit({
      type: 'canvas.document.update',
      format: 'html',
      title: title || 'Preview',
      previewHtml: sanitized,
    });
    return { success: true, sanitized, title: title || null };
  }

  async function buildWebsite(args) {
    const { title } = args || {};
    if (!title) return { success: false, error: 'missing_title' };

    safeEmit({
      type: 'canvas.document.update',
      format: 'zip',
      title,
      previewHtml: buildPlaceholderPreview('html', title),
    });

    try {
      const file = await runSkill({
        skillKey: 'webapp-bundle',
        spec: args,
        workspaceId: metadata.workspaceId,
        companyId: metadata.companyId,
        threadId: metadata.threadId,
        uploadedBy: metadata.uploadedBy,
        emit,
      });

      safeEmit({
        type: 'canvas.document.done',
        format: 'zip',
        title,
        fileId: file.fileId,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
      });

      return {
        success: true,
        format: 'zip',
        fileId: file.fileId,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
      };
    } catch (err) {
      safeEmit({
        type: 'canvas.document.error',
        format: 'zip',
        title,
        error: err?.message || String(err),
      });
      return { success: false, error: err?.message || String(err), stderr: err?.stderr || null };
    }
  }

  const tools = {
    generate_document: generateDocument,
    edit_document: editDocument,
    render_html_preview: renderHtmlPreview,
    build_website: buildWebsite,
  };

  return {
    definitions: defs,
    canHandle(name) { return names.has(name); },
    async execute(name, input) {
      if (!names.has(name)) throw new Error(`Unknown document tool: ${name}`);
      try {
        return await tools[name](input || {});
      } catch (err) {
        return { success: false, error: err?.message || String(err) };
      }
    },
    async cleanup() { /* nothing to persist */ },
  };
}

module.exports = {
  DOCUMENT_TOOL_DEFINITIONS,
  createDocumentExecutor,
  sanitizeHtml,
  SKILL_BUNDLE,
};
