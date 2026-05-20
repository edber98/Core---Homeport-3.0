/**
 * WhatsApp Business Cloud API utility - HTTP calls to https://graph.facebook.com/v18.0
 */

async function readJsonResponse(res) {
  if (res && typeof res.json === "function") return res.json();
  const text = res && typeof res.text === "function" ? await res.text() : "";
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function whatsappRequest(opts, method, path, body = null) {
  const credentials = (opts && opts.credentials) || {};
  const accessToken = credentials.accessToken;
  if (!accessToken) return { ok: false, error: "Token d'accès WhatsApp manquant." };

  const options = {
    method,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  };
  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`https://graph.facebook.com/v18.0${path}`, options);
  } catch (e) { return { ok: false, error: e.message }; }

  let data;
  try {
    data = await readJsonResponse(res);
  } catch (e) { return { ok: false, error: "Réponse invalide de WhatsApp." }; }

  if (data.error) return { ok: false, error: data.error.message || "WhatsApp API error", details: data.error };
  return { ok: true, ...data };
}

function getPhoneNumberId(opts) {
  const credentials = (opts && opts.credentials) || {};
  return credentials.phoneNumberId || "";
}

/**
 * Resolve a file arg value (fileRef object or URL string) to a Buffer + mimeType.
 * Returns { buffer, mimeType, name } or null if the value is not a file reference.
 */
async function resolveFileArg(value, opts) {
  // Cas 1: fileRef object from file field
  if (value && typeof value === 'object' && (value._type === 'fileRef' || value.fileId)) {
    if (!opts.files) return null;
    const buf = await opts.files.resolveAsBuffer(value);
    return { buffer: buf, mimeType: value.mimeType || 'application/octet-stream', name: value.name || 'file' };
  }
  // Cas 2: URL string (expression mode / backward compat)
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    const res = await fetch(value);
    if (!res.ok) throw new Error(`Téléchargement échoué: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') || 'application/octet-stream';
    const urlPath = new URL(value).pathname;
    const name = decodeURIComponent(urlPath.split('/').pop() || 'file');
    return { buffer: buf, mimeType: mime.split(';')[0].trim(), name };
  }
  return null;
}

/**
 * Upload a Buffer to WhatsApp media endpoint.
 * Returns { id } (the WhatsApp media ID) or throws.
 */
async function uploadMediaBuffer(opts, buffer, mimeType, filename) {
  const credentials = (opts && opts.credentials) || {};
  const accessToken = credentials.accessToken;
  if (!accessToken) throw new Error("Token d'accès WhatsApp manquant.");
  const phoneNumberId = getPhoneNumberId(opts);

  const blob = new Blob([buffer], { type: mimeType });
  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("type", mimeType);
  formData.append("file", blob, filename || "file");

  const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/media`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${accessToken}` },
    body: formData
  });

  const data = await readJsonResponse(res);
  if (data.error) throw new Error(data.error.message || "Erreur upload média WhatsApp");
  return data;
}

module.exports = { utils: { whatsappRequest, getPhoneNumberId, resolveFileArg, uploadMediaBuffer, readJsonResponse } };
