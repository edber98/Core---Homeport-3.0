async function facebookRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const accessToken = credentials.accessToken;
  if (!accessToken) return { ok: false, error: "Missing Facebook access token." };

  const baseUrl = (credentials.baseUrl || "https://graph.facebook.com/v18.0").replace(/\/$/, "");
  const url = new URL(`${baseUrl}${path}`);
  url.searchParams.set("access_token", accessToken);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const method = options.method || "GET";
  const body = options.body ? JSON.stringify(options.body) : undefined;

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    return { ok: false, error: data?.error?.message || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

async function facebookUploadPhoto(opts, path, buffer, mimeType, extraFields = {}) {
  const credentials = (opts && opts.credentials) || {};
  const accessToken = credentials.accessToken;
  if (!accessToken) return { ok: false, error: "Missing Facebook access token." };

  const baseUrl = (credentials.baseUrl || "https://graph.facebook.com/v18.0").replace(/\/$/, "");
  const url = `${baseUrl}${path}`;

  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
  const parts = [];

  // Access token
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="access_token"\r\n\r\n${accessToken}`);

  // Extra fields (caption, etc.)
  for (const [k, v] of Object.entries(extraFields)) {
    if (v !== undefined && v !== null && v !== "") {
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}`);
    }
  }

  // File part
  const ext = (mimeType || 'image/jpeg').split('/')[1] || 'jpg';
  const filename = `photo.${ext}`;
  const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="source"; filename="${filename}"\r\nContent-Type: ${mimeType || 'image/jpeg'}\r\n\r\n`;
  const fileFooter = `\r\n--${boundary}--\r\n`;

  const headerBuf = Buffer.from(fileHeader, 'utf-8');
  const footerBuf = Buffer.from(fileFooter, 'utf-8');
  const fieldsBuf = Buffer.from(parts.join('\r\n') + '\r\n', 'utf-8');
  const body = Buffer.concat([fieldsBuf, headerBuf, buffer, footerBuf]);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    return { ok: false, error: data?.error?.message || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

module.exports = { utils: { facebookRequest, facebookUploadPhoto } };
