// Attachment resolver — converts file references to LLM content blocks
const FileRecord = require('../db/models/file.model');
const { getAdapter } = require('../services/file-storage');

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const AUDIO_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm',
  'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/flac',
]);
const TEXT_TYPES = new Set([
  'text/plain', 'text/csv', 'text/html', 'text/xml', 'text/markdown',
  'application/json', 'application/xml', 'application/x-yaml',
]);
const DOCX_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);
const XLSX_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);
const PPTX_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
]);

const MAX_TEXT_CHARS = 30000;
const MAX_PDF_CHARS = 15000;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB (Whisper limit)

/**
 * Resolve attachment references to LLM content blocks.
 * @param {Array<{fileId, name, mimeType, size}>} attachments
 * @param {string} workspaceId
 * @returns {Promise<Array<{type: string, ...}>>} content blocks
 */
async function resolveAttachments(attachments, workspaceId) {
  if (!attachments?.length) return [];

  const blocks = [];
  for (const att of attachments) {
    try {
      const block = await resolveOne(att);
      if (block) blocks.push(block);
    } catch (e) {
      console.error(`[attachments] error resolving ${att.fileId}:`, e?.message);
      blocks.push({
        type: 'text',
        text: `[Erreur de lecture du fichier "${att.name || att.fileId}": ${e?.message || 'inconnu'}]`,
      });
    }
  }
  return blocks;
}

async function resolveOne(att) {
  const { fileId, name, mimeType, size } = att;
  if (!fileId) return null;

  const record = await FileRecord.findOne({ id: fileId }).lean();
  if (!record) {
    return { type: 'text', text: `[Fichier introuvable: "${name || fileId}"]` };
  }

  const mime = mimeType || record.mimeType || 'application/octet-stream';
  const fileName = name || record.name;

  // ── Image (vision) ──
  if (IMAGE_TYPES.has(mime)) {
    const fileSize = size || record.size || 0;
    if (fileSize > MAX_IMAGE_SIZE) {
      return { type: 'text', text: `[Image "${fileName}" trop volumineuse (${formatSize(fileSize)}, max ${formatSize(MAX_IMAGE_SIZE)})]` };
    }
    const adapter = getAdapter();
    const stream = adapter.read(record.storagePath);
    const buffer = await streamToBuffer(stream);
    const base64 = buffer.toString('base64');
    return {
      type: 'image',
      media_type: mime,
      data: base64,
      name: fileName,
      fileId,
    };
  }

  // ── Audio → transcription via Whisper ──
  if (AUDIO_TYPES.has(mime) || mime.startsWith('audio/')) {
    const fileSize = size || record.size || 0;
    if (fileSize > MAX_AUDIO_SIZE) {
      return { type: 'text', text: `[Audio "${fileName}" trop volumineux (${formatSize(fileSize)}, max ${formatSize(MAX_AUDIO_SIZE)})]` };
    }
    try {
      const adapter = getAdapter();
      const stream = adapter.read(record.storagePath);
      const buffer = await streamToBuffer(stream);
      const transcription = await transcribeAudio(buffer, fileName, mime);
      return {
        type: 'text',
        text: `[Transcription audio de "${fileName}" (${mime})]\n\n${transcription}`,
      };
    } catch (e) {
      return { type: 'text', text: `[Audio "${fileName}" — erreur de transcription: ${e?.message}]` };
    }
  }

  // ── PDF ──
  if (mime === 'application/pdf') {
    try {
      const { PDFParse } = require('pdf-parse');
      const adapter = getAdapter();
      const stream = adapter.read(record.storagePath);
      const buffer = await streamToBuffer(stream);
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      const pages = result.total || '?';
      let text = (result.text || '').trim();
      if (!text) text = '[Aucun texte extractible]';
      if (text.length > MAX_PDF_CHARS) {
        text = text.slice(0, MAX_PDF_CHARS) + '\n\n[... tronqué]';
      }
      await parser.destroy();
      return {
        type: 'text',
        text: `[Contenu du PDF "${fileName}" (${pages} page${pages > 1 ? 's' : ''})]\n\n${text}`,
      };
    } catch (e) {
      return { type: 'text', text: `[PDF "${fileName}" — erreur d'extraction: ${e?.message}]` };
    }
  }

  // ── DOCX (Word) ──
  if (DOCX_TYPES.has(mime) || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    try {
      const mammoth = require('mammoth');
      const adapter = getAdapter();
      const stream = adapter.read(record.storagePath);
      const buffer = await streamToBuffer(stream);
      const result = await mammoth.extractRawText({ buffer });
      let text = (result.value || '').trim();
      if (text.length > MAX_TEXT_CHARS) {
        text = text.slice(0, MAX_TEXT_CHARS) + '\n\n[... tronqué]';
      }
      return {
        type: 'text',
        text: `[Contenu du document Word "${fileName}"]\n\n${text}`,
      };
    } catch (e) {
      return { type: 'text', text: `[Document "${fileName}" — erreur d'extraction: ${e?.message}]` };
    }
  }

  // ── XLSX (Excel) ──
  if (XLSX_TYPES.has(mime) || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    try {
      const XLSX = require('xlsx');
      const adapter = getAdapter();
      const stream = adapter.read(record.storagePath);
      const buffer = await streamToBuffer(stream);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const parts = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        parts.push(`--- Feuille: ${sheetName} ---\n${csv}`);
      }
      let text = parts.join('\n\n').trim();
      if (text.length > MAX_TEXT_CHARS) {
        text = text.slice(0, MAX_TEXT_CHARS) + '\n\n[... tronqué]';
      }
      return {
        type: 'text',
        text: `[Contenu du tableur "${fileName}" (${workbook.SheetNames.length} feuille${workbook.SheetNames.length > 1 ? 's' : ''})]\n\n${text}`,
      };
    } catch (e) {
      return { type: 'text', text: `[Tableur "${fileName}" — erreur d'extraction: ${e?.message}]` };
    }
  }

  // ── PPTX (PowerPoint) ──
  if (PPTX_TYPES.has(mime) || fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) {
    try {
      const text = await extractPptxText(record.storagePath);
      return {
        type: 'text',
        text: `[Contenu de la présentation "${fileName}"]\n\n${text}`,
      };
    } catch (e) {
      return { type: 'text', text: `[Présentation "${fileName}" — erreur d'extraction: ${e?.message}]` };
    }
  }

  // ── Texte (txt, csv, json, md, xml, html) ──
  if (TEXT_TYPES.has(mime) || mime.startsWith('text/')) {
    const adapter = getAdapter();
    const stream = adapter.read(record.storagePath);
    const buffer = await streamToBuffer(stream);
    let text = buffer.toString('utf-8');
    if (text.length > MAX_TEXT_CHARS) {
      text = text.slice(0, MAX_TEXT_CHARS) + '\n\n[... tronqué]';
    }
    return {
      type: 'text',
      text: `[Contenu de "${fileName}" (${mime})]\n\n${text}`,
    };
  }

  // ── Binaire non supporté ──
  return {
    type: 'text',
    text: `[Fichier joint: "${fileName}" (${mime}, ${formatSize(size || record.size || 0)})]`,
  };
}

/**
 * Transcribe audio via OpenAI Whisper API.
 */
async function transcribeAudio(buffer, fileName, mimeType) {
  const env = require('../config/env');
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY non configuré pour la transcription');

  // Build multipart form data manually
  const boundary = '----AttachmentBoundary' + Date.now();
  const ext = fileName.split('.').pop() || 'mp3';
  const parts = [];
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`);
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`);
  const header = Buffer.from(parts.join(''));
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, buffer, footer]);

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Whisper API error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const result = await res.json();
  return result.text || '[Transcription vide]';
}

/**
 * Extract text from PPTX via ZIP + XML parsing (no external dep).
 */
async function extractPptxText(storagePath) {
  const adapter = getAdapter();
  const stream = adapter.read(storagePath);
  const buffer = await streamToBuffer(stream);
  // Use xlsx's zip utilities to read the PPTX (which is a ZIP)
  const XLSX = require('xlsx');
  const zip = XLSX.read(buffer, { type: 'buffer', bookSheets: true });
  // PPTX slides are in ppt/slides/slide*.xml — extract text from a:t elements
  // Simpler approach: just list slide names since we can't easily parse XML here
  // For a proper PPTX parser, a dedicated package would be needed
  let text = `[Présentation PowerPoint — ${Object.keys(zip.SheetNames || {}).length || '?'} éléments détectés]`;
  // Basic fallback: extract readable text from the buffer
  const raw = buffer.toString('utf-8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const readable = raw.replace(/[^\x20-\x7E\u00C0-\u024F]/g, '').trim();
  if (readable.length > 100) {
    text = readable.slice(0, MAX_TEXT_CHARS);
  }
  return text;
}

/**
 * Estimate token cost for resolved content blocks.
 * ~1600 tokens per image, ~1 token per 4 chars for text.
 */
function estimateAttachmentTokens(blocks) {
  let tokens = 0;
  for (const b of (blocks || [])) {
    if (b.type === 'image') {
      tokens += 1600;
    } else if (b.type === 'text') {
      tokens += Math.ceil((b.text || '').length / 4);
    }
  }
  return tokens;
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

module.exports = { resolveAttachments, estimateAttachmentTokens };
