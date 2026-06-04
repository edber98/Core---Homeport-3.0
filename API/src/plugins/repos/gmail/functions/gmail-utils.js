const MailComposer = require('nodemailer/lib/mail-composer');
const { getOAuth2AccessToken } = require('../../../../oauth/oauth2-runtime');

const GMAIL_API_ROOT = 'https://gmail.googleapis.com/';

function trim(value) {
  return String(value == null ? '' : value).trim();
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isDefined(value) {
  return !(value == null || value === '' || (Array.isArray(value) && !value.length));
}

function snakeToCamel(value) {
  return String(value || '').replace(/_([a-z])/g, (_match, chr) => chr.toUpperCase());
}

function toBase64Url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input || ''), 'utf8');
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input) {
  const raw = trim(input).replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
  if (!raw) return Buffer.alloc(0);
  const padding = raw.length % 4 ? '='.repeat(4 - (raw.length % 4)) : '';
  return Buffer.from(raw + padding, 'base64');
}

function looksLikeRfc822(input) {
  const raw = String(input || '');
  return /[\r\n]/.test(raw) && /^(from|to|cc|bcc|subject|date|mime-version|content-type):/im.test(raw);
}

function normalizeRawInput(raw) {
  const value = trim(raw);
  if (!value) return '';
  if (looksLikeRfc822(value)) return toBase64Url(value);
  return value.replace(/-/g, '-').replace(/_/g, '_').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '').replace(/\s+/g, '');
}

function parseJsonInput(value, label = 'JSON') {
  if (value == null || value === '') return undefined;
  if (typeof value === 'object') return value;
  const raw = trim(value);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} invalide.`);
  }
}

function parseListInput(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.map((item) => trim(item)).filter(Boolean);
  if (typeof value === 'string') {
    const raw = trim(value);
    if (!raw) return [];
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        return parseListInput(parsed);
      } catch {
        return raw.split(/[,\n;]/).map((item) => trim(item)).filter(Boolean);
      }
    }
    return raw.split(/[,\n;]/).map((item) => trim(item)).filter(Boolean);
  }
  return [trim(value)].filter(Boolean);
}

function parseBodyFieldValue(rawValue, parseMode, label) {
  if (parseMode === 'json') return parseJsonInput(rawValue, label);
  if (parseMode === 'tags') {
    const list = parseListInput(rawValue);
    return list.length ? list : undefined;
  }
  if (parseMode === 'boolean') {
    if (rawValue === '' || rawValue == null) return undefined;
    if (typeof rawValue === 'boolean') return rawValue;
    const normalized = trim(rawValue).toLowerCase();
    if (!normalized) return undefined;
    if (['true', '1', 'yes', 'oui', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'non', 'off'].includes(normalized)) return false;
    return Boolean(rawValue);
  }
  if (parseMode === 'number') {
    if (rawValue === '' || rawValue == null) return undefined;
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) throw new Error(`${label} doit être numérique.`);
    return parsed;
  }
  const text = typeof rawValue === 'string' ? trim(rawValue) : rawValue;
  return text === '' ? undefined : text;
}

function setDeep(target, path, value) {
  if (!Array.isArray(path) || !path.length) return;
  let cursor = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    if (!isPlainObject(cursor[key])) cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]] = value;
}

function buildBodyFromMeta(inputs, bodyFields = []) {
  const body = {};
  for (const field of bodyFields) {
    const label = field.inputKey || field.targetPath?.join('.') || 'body';
    const rawValue = inputs?.[field.inputKey] ?? inputs?.[snakeToCamel(field.inputKey)];
    const value = parseBodyFieldValue(rawValue, field.parse, label);
    if (!isDefined(value) && value !== false) continue;
    setDeep(body, field.targetPath || [], value);
  }
  return Object.keys(body).length ? body : undefined;
}

function normalizeQueryValue(value) {
  if (value == null || value === '') return undefined;
  if (Array.isArray(value)) {
    const list = value.map((item) => trim(item)).filter(Boolean);
    return list.length ? list : undefined;
  }
  if (typeof value === 'string') {
    const raw = trim(value);
    if (!raw) return undefined;
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        const list = parseListInput(parsed);
        return list.length ? list : undefined;
      } catch {
        return raw;
      }
    }
    return raw;
  }
  return value;
}

async function gmailApiRequest(opts, { method = 'GET', pathTemplate, pathParams = {}, query = {}, body }) {
  const credentials = (opts && opts.credentials) || {};
  let accessToken;
  try {
    accessToken = await getOAuth2AccessToken({ providerKey: 'gmail', credentials });
  } catch (error) {
    return { ok: false, error: error.message || 'Impossible de rafraîchir le token OAuth2.' };
  }

  let path = String(pathTemplate || '').replace(/^\/+/, '');
  for (const [name, rawValue] of Object.entries(pathParams || {})) {
    const value = trim(rawValue);
    if (!value) return { ok: false, error: `${name} est requis.` };
    path = path.replace(`{${name}}`, encodeURIComponent(value));
  }

  const url = new URL(path, GMAIL_API_ROOT);
  for (const [name, rawValue] of Object.entries(query || {})) {
    const value = normalizeQueryValue(rawValue);
    if (value == null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(name, String(item));
      continue;
    }
    url.searchParams.set(name, String(value));
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };
  let requestBody;
  if (body !== undefined && !(isPlainObject(body) && !Object.keys(body).length)) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: requestBody,
    });
  } catch (error) {
    return { ok: false, error: error.message || 'Échec de l’appel Gmail API.' };
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message = data?.error?.message || data?.error || `HTTP ${response.status}`;
    return { ok: false, error: message, status: response.status, details: data };
  }

  return { ok: true, status: response.status, data };
}

function headersArrayToMap(headers = []) {
  const out = {};
  for (const entry of Array.isArray(headers) ? headers : []) {
    const name = trim(entry?.name).toLowerCase();
    if (!name) continue;
    out[name] = entry?.value || '';
  }
  return out;
}

function collectMessageParts(part, out = []) {
  if (!part || typeof part !== 'object') return out;
  out.push(part);
  for (const child of Array.isArray(part.parts) ? part.parts : []) collectMessageParts(child, out);
  return out;
}

function decodeBodyData(body) {
  try {
    if (!body?.data) return '';
    return fromBase64Url(body.data).toString('utf8');
  } catch {
    return '';
  }
}

function extractMimeBody(payload, mimeType) {
  const parts = collectMessageParts(payload, []);
  const match = parts.find((part) => String(part?.mimeType || '').toLowerCase() === String(mimeType || '').toLowerCase() && part?.body?.data);
  return match ? decodeBodyData(match.body) : '';
}

function extractAttachments(payload) {
  const parts = collectMessageParts(payload, []);
  return parts
    .filter((part) => trim(part?.filename) || trim(part?.body?.attachmentId))
    .map((part) => ({
      partId: part.partId || '',
      filename: part.filename || '',
      mimeType: part.mimeType || '',
      attachmentId: part.body?.attachmentId || '',
      size: part.body?.size || 0,
    }));
}

function decorateMessage(message) {
  if (!isPlainObject(message)) return message;
  const payload = message.payload || {};
  const headers = headersArrayToMap(payload.headers);
  const attachments = extractAttachments(payload);
  const textBody = extractMimeBody(payload, 'text/plain');
  const htmlBody = extractMimeBody(payload, 'text/html');
  return {
    ...message,
    headers,
    subject: headers.subject || message.subject || '',
    from: headers.from || '',
    to: headers.to || '',
    cc: headers.cc || '',
    bcc: headers.bcc || '',
    date: headers.date || '',
    messageIdHeader: headers['message-id'] || '',
    textBody,
    htmlBody,
    attachments,
    attachmentCount: attachments.length,
  };
}

function decorateDraft(draft) {
  if (!isPlainObject(draft)) return draft;
  return {
    ...draft,
    message: decorateMessage(draft.message),
  };
}

function decorateThread(thread) {
  if (!isPlainObject(thread)) return thread;
  const messages = Array.isArray(thread.messages) ? thread.messages.map(decorateMessage) : [];
  return {
    ...thread,
    messages,
    messageCount: messages.length,
    subject: messages[0]?.subject || '',
    from: messages[0]?.from || '',
  };
}

async function resolveAttachmentPayload(data, inputs, opts) {
  const out = {
    dataBase64Url: data?.data || '',
    dataBase64: data?.data ? fromBase64Url(data.data).toString('base64') : '',
    size: data?.size || 0,
  };
  if (inputs?.storeAttachment && opts?.files && data?.data) {
    const buffer = fromBase64Url(data.data);
    out.file = await opts.files.store(buffer, {
      name: trim(inputs.attachmentName) || `gmail-attachment-${trim(inputs.id) || 'file'}.bin`,
      mimeType: trim(inputs.attachmentMimeType) || 'application/octet-stream',
      lifecycle: trim(inputs.attachmentLifecycle) || 'execution',
    });
  }
  return out;
}

function decorateSuccess(meta, data, inputs, opts) {
  if (meta?.responseSchema === 'Message') return Promise.resolve({ ok: true, ...decorateMessage(data) });
  if (meta?.responseSchema === 'Draft') return Promise.resolve({ ok: true, ...decorateDraft(data) });
  if (meta?.responseSchema === 'Thread') return Promise.resolve({ ok: true, ...decorateThread(data) });
  if (meta?.responseSchema === 'ListDraftsResponse') {
    const drafts = Array.isArray(data?.drafts) ? data.drafts.map(decorateDraft) : [];
    return Promise.resolve({ ok: true, ...data, drafts, totalCount: data?.resultSizeEstimate || drafts.length });
  }
  if (meta?.responseSchema === 'ListMessagesResponse') {
    const messages = Array.isArray(data?.messages) ? data.messages : [];
    return Promise.resolve({ ok: true, ...data, messages, totalCount: data?.resultSizeEstimate || messages.length });
  }
  if (meta?.responseSchema === 'ListThreadsResponse') {
    const threads = Array.isArray(data?.threads) ? data.threads : [];
    return Promise.resolve({ ok: true, ...data, threads, totalCount: data?.resultSizeEstimate || threads.length });
  }
  if (meta?.responseSchema === 'ListHistoryResponse') {
    const history = Array.isArray(data?.history) ? data.history : [];
    return Promise.resolve({ ok: true, ...data, history, totalCount: history.length });
  }
  if (meta?.responseSchema === 'MessagePartBody') {
    return resolveAttachmentPayload(data, inputs, opts).then((attachment) => ({ ok: true, ...data, ...attachment }));
  }
  if (data && typeof data === 'object') return Promise.resolve({ ok: true, ...data });
  return Promise.resolve({ ok: true, data });
}

function buildNoContentResult(meta, inputs) {
  const base = { ok: true, success: true };
  if (meta?.action === 'delete') base.deleted = true;
  if (meta?.action === 'trash') base.trashed = true;
  if (meta?.action === 'untrash') base.untrashed = true;
  if (meta?.action === 'enable') base.enabled = true;
  if (meta?.action === 'disable') base.disabled = true;
  if (meta?.action === 'verify') base.verificationRequested = true;
  if (meta?.action === 'set_default') base.defaultSet = true;
  if (meta?.action === 'stop') base.stopped = true;
  if (meta?.action === 'batch_delete') base.deleted = true;
  if (meta?.action === 'batch_modify') base.modified = true;
  for (const key of ['id', 'draftId', 'messageId', 'threadId', 'sendAsEmail', 'delegateEmail', 'forwardingEmail', 'keyPairId']) {
    if (isDefined(inputs?.[key])) base[key] = inputs[key];
  }
  return base;
}

async function resolveLabelIds(opts, userId, values) {
  const requested = parseListInput(values);
  if (!requested.length) return [];
  const result = await gmailApiRequest(opts, {
    method: 'GET',
    pathTemplate: 'gmail/v1/users/{userId}/labels',
    pathParams: { userId: userId || 'me' },
  });
  if (!result.ok) throw new Error(result.error || 'Impossible de résoudre les libellés Gmail.');
  const labels = Array.isArray(result.data?.labels) ? result.data.labels : [];
  return requested.map((value) => {
    const exact = labels.find((label) => String(label.id) === value || String(label.name || '').toLowerCase() === value.toLowerCase());
    return exact ? exact.id : value;
  });
}

async function resolveMailAttachments(value, opts) {
  const rawItems = Array.isArray(value) ? value : (value ? [value] : []);
  const attachments = [];
  for (const item of rawItems) {
    const fileValue = item?.file || item;
    if (!fileValue) continue;
    if (fileValue && typeof fileValue === 'object' && (fileValue.fileId || fileValue._type === 'fileRef')) {
      if (!opts?.files) throw new Error('Helper files indisponible pour les pièces jointes.');
      const buffer = await opts.files.resolveAsBuffer(fileValue);
      attachments.push({
        filename: item.filename || fileValue.name || 'attachment',
        content: buffer,
        contentType: item.contentType || fileValue.mimeType || 'application/octet-stream',
      });
      continue;
    }
    if (typeof fileValue === 'string' && /^https?:\/\//i.test(fileValue)) {
      attachments.push({
        filename: item.filename || 'attachment',
        path: fileValue,
      });
      continue;
    }
    if (item?.filename && item?.content) {
      attachments.push(item);
    }
  }
  return attachments;
}

async function buildMimeRaw(inputs, opts) {
  const providedRaw = normalizeRawInput(inputs?.raw);
  if (providedRaw) return providedRaw;

  const attachments = await resolveMailAttachments(inputs?.attachments, opts);
  const headers = parseJsonInput(inputs?.headersJson, 'headersJson') || undefined;
  const composer = new MailComposer({
    from: trim(inputs?.from) || undefined,
    to: trim(inputs?.to) || undefined,
    cc: trim(inputs?.cc) || undefined,
    bcc: trim(inputs?.bcc) || undefined,
    replyTo: trim(inputs?.replyTo) || undefined,
    inReplyTo: trim(inputs?.inReplyTo) || undefined,
    references: trim(inputs?.references) || undefined,
    subject: trim(inputs?.subject) || undefined,
    text: inputs?.text || undefined,
    html: inputs?.html || undefined,
    headers,
    attachments: attachments.length ? attachments : undefined,
  });
  const buffer = await composer.compile().build();
  return toBase64Url(buffer);
}

async function buildComposeMessage(inputs, opts) {
  const raw = await buildMimeRaw(inputs, opts);
  if (!raw) throw new Error('Renseigne un message brut ou au minimum un destinataire / contenu à composer.');
  const labelIds = parseListInput(inputs?.labelIds);
  const classificationLabelValues = parseJsonInput(inputs?.classificationLabelValuesJson, 'classificationLabelValuesJson');
  const message = { raw };
  if (trim(inputs?.threadId)) message.threadId = trim(inputs.threadId);
  if (labelIds.length) message.labelIds = labelIds;
  if (classificationLabelValues) message.classificationLabelValues = classificationLabelValues;
  return message;
}

module.exports = {
  buildBodyFromMeta,
  buildComposeMessage,
  buildNoContentResult,
  decorateSuccess,
  gmailApiRequest,
  parseJsonInput,
  parseListInput,
  resolveLabelIds,
  trim,
  _internals: {
    fromBase64Url,
    normalizeRawInput,
    toBase64Url,
    decorateMessage,
    decorateDraft,
    decorateThread,
    parseBodyFieldValue,
    normalizeQueryValue,
  },
};
