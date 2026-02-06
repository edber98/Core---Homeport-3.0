const { XMLParser } = (() => { try { return require("fast-xml-parser"); } catch { return { XMLParser: null }; } })();

/**
 * Build Basic Auth header from credentials.
 */
function authHeaders(credentials) {
  const { username, password } = credentials;
  const token = Buffer.from(`${username}:${password}`).toString("base64");
  return { "Authorization": `Basic ${token}` };
}

/**
 * Generic Nextcloud HTTP request helper.
 */
async function nextcloudRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const baseUrl = (credentials.url || "").replace(/\/+$/, "");
  if (!baseUrl) return { ok: false, error: "Missing Nextcloud URL." };

  const url = `${baseUrl}${path}`;
  const method = options.method || "GET";

  const headers = {
    ...authHeaders(credentials),
    ...(options.headers || {})
  };

  if (!headers["Content-Type"] && options.body && typeof options.body === "object" && !options.rawBody) {
    headers["Content-Type"] = "application/json";
  }

  let body = undefined;
  if (options.body) {
    body = (options.rawBody || typeof options.body === "string") ? options.body : JSON.stringify(options.body);
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  if (options.rawResponse) {
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, status: res.status };
    const buffer = await res.arrayBuffer();
    return { ok: true, data: Buffer.from(buffer).toString("base64"), contentType: res.headers.get("content-type") };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch {
      if (XMLParser) {
        try { const parser = new XMLParser({ ignoreAttributes: false }); data = parser.parse(text); } catch { data = text; }
      } else {
        data = text;
      }
    }
  }

  if (!res.ok && res.status >= 400) {
    const msg = (data && data.ocs && data.ocs.meta && data.ocs.meta.message) || `HTTP ${res.status}`;
    return { ok: false, error: msg, status: res.status, details: data };
  }

  return { ok: true, data, status: res.status };
}

/**
 * WebDAV request helper for /remote.php/dav/files/{user}/
 */
async function webdavRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const username = credentials.username || "";
  const fullPath = `/remote.php/dav/files/${encodeURIComponent(username)}/${(path || "").replace(/^\/+/, "")}`;
  return nextcloudRequest(opts, fullPath, options);
}

/**
 * OCS API request helper with format=json.
 */
async function ocsRequest(opts, path, options = {}) {
  const headers = {
    "OCS-APIRequest": "true",
    "Accept": "application/json",
    ...(options.headers || {})
  };
  const separator = path.includes("?") ? "&" : "?";
  const fullPath = `${path}${separator}format=json`;
  return nextcloudRequest(opts, fullPath, { ...options, headers });
}

/**
 * CalDAV request helper for /remote.php/dav/calendars/{user}/
 */
async function caldavRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const username = credentials.username || "";
  const fullPath = `/remote.php/dav/calendars/${encodeURIComponent(username)}/${(path || "").replace(/^\/+/, "")}`;
  return nextcloudRequest(opts, fullPath, options);
}

/**
 * Parse WebDAV multistatus XML response into file entries.
 */
function parseWebdavMultistatus(data) {
  if (!data || typeof data !== "object") return [];
  const ms = data["d:multistatus"] || data["D:multistatus"] || data.multistatus || data;
  let responses = ms["d:response"] || ms["D:response"] || ms.response || [];
  if (!Array.isArray(responses)) responses = [responses];
  return responses.map(r => {
    const href = r["d:href"] || r["D:href"] || r.href || "";
    const props = r["d:propstat"]?.["d:prop"] || r["D:propstat"]?.["D:prop"] || r.propstat?.prop || {};
    return {
      name: (href.split("/").filter(Boolean).pop() || "").replace(/%20/g, " "),
      path: decodeURIComponent(href),
      contentType: props["d:getcontenttype"] || props["D:getcontenttype"] || props.getcontenttype || "",
      size: props["d:getcontentlength"] || props["D:getcontentlength"] || props.getcontentlength || "",
      lastModified: props["d:getlastmodified"] || props["D:getlastmodified"] || props.getlastmodified || "",
      etag: props["d:getetag"] || props["D:getetag"] || props.getetag || ""
    };
  });
}

/**
 * Parse iCalendar text into event object.
 */
function parseICalEvent(icsText) {
  const lines = (icsText || "").split(/\r?\n/);
  const event = {};
  for (const line of lines) {
    const [key, ...rest] = line.split(":");
    const val = rest.join(":");
    const cleanKey = (key || "").split(";")[0].toUpperCase();
    if (cleanKey === "SUMMARY") event.summary = val;
    else if (cleanKey === "DTSTART") event.dtstart = val;
    else if (cleanKey === "DTEND") event.dtend = val;
    else if (cleanKey === "DESCRIPTION") event.description = val;
    else if (cleanKey === "LOCATION") event.location = val;
    else if (cleanKey === "UID") event.id = val;
    else if (cleanKey === "STATUS") event.status = val;
  }
  return event;
}

module.exports = { utils: { nextcloudRequest, webdavRequest, ocsRequest, caldavRequest, authHeaders, parseWebdavMultistatus, parseICalEvent } };
