async function instagramRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const accessToken = credentials.accessToken;
  if (!accessToken) return { ok: false, error: "Token d'accès Instagram manquant." };

  const baseUrl = String(credentials.baseUrl || "https://graph.facebook.com/v24.0").replace(/\/+$/, "");
  const url = new URL(`${baseUrl}${path}`);
  url.searchParams.set("access_token", accessToken);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
  }

  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
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

function listData(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function mapMedia(media) {
  const m = media || {};
  return {
    id: m.id || "",
    caption: m.caption || "",
    mediaType: m.media_type || "",
    mediaUrl: m.media_url || "",
    permalink: m.permalink || "",
    timestamp: m.timestamp || "",
    username: m.username || "",
    commentsCount: m.comments_count || 0,
    likeCount: m.like_count || 0
  };
}

function mapComment(comment) {
  const c = comment || {};
  return {
    id: c.id || "",
    text: c.text || "",
    username: c.username || "",
    timestamp: c.timestamp || "",
    hidden: Boolean(c.hidden)
  };
}

module.exports = { utils: { instagramRequest, listData, mapMedia, mapComment } };
