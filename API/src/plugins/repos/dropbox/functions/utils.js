const RPC_URL = "https://api.dropboxapi.com/2";
const CONTENT_URL = "https://content.dropboxapi.com/2";

async function dbxRequest(opts, endpoint, body = null, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const { accessToken } = credentials;
  if (!accessToken) return { ok: false, error: "Missing Dropbox access token." };

  const isContent = options.isContent || false;
  const baseUrl = isContent ? CONTENT_URL : RPC_URL;
  const url = `${baseUrl}${endpoint}`;

  const headers = {
    "Authorization": `Bearer ${accessToken}`
  };

  let fetchBody;
  if (isContent && options.upload) {
    headers["Content-Type"] = "application/octet-stream";
    headers["Dropbox-API-Arg"] = JSON.stringify(body);
    fetchBody = options.upload;
  } else if (isContent && !options.upload) {
    headers["Dropbox-API-Arg"] = JSON.stringify(body);
    fetchBody = undefined;
  } else {
    headers["Content-Type"] = "application/json";
    fetchBody = body ? JSON.stringify(body) : undefined;
  }

  let res;
  try {
    res = await fetch(url, { method: "POST", headers, body: fetchBody });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  if (isContent && !options.upload && res.ok) {
    const apiResult = JSON.parse(res.headers.get("dropbox-api-result") || "{}");
    const buffer = await res.arrayBuffer();
    return { ok: true, data: apiResult, content: Buffer.from(buffer).toString("base64") };
  }

  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }

  if (!res.ok) {
    const msg = data?.error_summary || data?.error?.message || `HTTP ${res.status}`;
    return { ok: false, error: msg, status: res.status, details: data };
  }

  return { ok: true, data };
}

function mapEntry(e) {
  return {
    id: e.id || "", name: e.name || "", path: e.path_display || e.path_lower || "",
    size: e.size != null ? String(e.size) : "", modified: e.server_modified || e.client_modified || "",
    rev: e.rev || "", contentHash: e.content_hash || "", tag: e[".tag"] || ""
  };
}

module.exports = { utils: { dbxRequest, mapEntry, RPC_URL, CONTENT_URL } };
