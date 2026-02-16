/**
 * Telegram Bot API utility - HTTP calls to https://api.telegram.org/bot{token}/{method}
 */

async function telegramRequest(opts, method, body = {}) {
  const credentials = (opts && opts.credentials) || {};
  const botToken = credentials.botToken;
  if (!botToken) return { ok: false, error: "Token du bot Telegram manquant." };

  let res;
  try {
    res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (e) { return { ok: false, error: e.message }; }

  const data = await res.json();
  if (!data.ok) return { ok: false, error: data.description || "Telegram API error", details: data };
  return { ok: true, ...(data.result || {}) };
}

/**
 * Send a multipart/form-data request to Telegram Bot API (for file uploads).
 * @param {object} opts - handler opts (with opts.credentials)
 * @param {string} method - Telegram API method (e.g. "sendPhoto")
 * @param {object} fields - plain text fields (chat_id, caption, etc.)
 * @param {string} fileField - the form field name for the file (e.g. "photo")
 * @param {Buffer} fileBuffer - the file content as a Buffer
 * @param {string} [fileName] - filename to send
 * @param {string} [mimeType] - MIME type of the file
 */
async function telegramMultipartRequest(opts, method, fields, fileField, fileBuffer, fileName, mimeType) {
  const credentials = (opts && opts.credentials) || {};
  const botToken = credentials.botToken;
  if (!botToken) return { ok: false, error: "Token du bot Telegram manquant." };

  const formData = new FormData();

  // Add text fields
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, String(value));
    }
  }

  // Add file field as a Blob
  const blob = new Blob([fileBuffer], { type: mimeType || "application/octet-stream" });
  formData.append(fileField, blob, fileName || "file");

  let res;
  try {
    res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST",
      body: formData
    });
  } catch (e) { return { ok: false, error: e.message }; }

  const data = await res.json();
  if (!data.ok) return { ok: false, error: data.description || "Telegram API error", details: data };
  return { ok: true, ...(data.result || {}) };
}

/**
 * Resolve a file arg value: handles fileRef objects, URL strings, and file_id strings.
 * Returns { buffer, fileName, mimeType } if it's a file to upload, or { value } if it's a string (URL/file_id).
 */
async function resolveFileArg(value, opts) {
  if (!value) return null;

  // fileRef object from Homeport file system
  if (typeof value === 'object' && (value._type === 'fileRef' || value.fileId)) {
    if (!opts.files) return { value: value.fileId || "" };
    const buf = await opts.files.resolveAsBuffer(value);
    return { buffer: buf, fileName: value.name || "file", mimeType: value.mimeType || "application/octet-stream" };
  }

  // String: URL or file_id
  if (typeof value === 'string') {
    // If it's a URL and we have the files helper, we can resolve it to a buffer for upload
    if (/^https?:\/\//i.test(value) && opts.files) {
      try {
        const buf = await opts.files.resolveAsBuffer(value);
        // Extract filename from URL
        const urlPath = new URL(value).pathname;
        const fileName = urlPath.split("/").pop() || "file";
        return { buffer: buf, fileName, mimeType: "application/octet-stream" };
      } catch {
        // Fallback: let Telegram fetch the URL itself
        return { value };
      }
    }
    return { value };
  }

  return null;
}

module.exports = { utils: { telegramRequest, telegramMultipartRequest, resolveFileArg } };
