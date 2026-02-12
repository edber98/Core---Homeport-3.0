/**
 * Odoo API utilities
 * Supports two authentication modes:
 * - "token": Bearer token via JSON-2 API (/json/2/)
 * - "login": Session-based via JSON-RPC (/web/session/authenticate)
 */

let sessionId = null;

// ── Login mode: session-based JSON-RPC auth ──

async function odooAuthenticate(credentials) {
  const { url, database, username, password } = credentials;
  if (!url || !database || !username || !password) throw new Error("Identifiants Odoo manquants (url, database, username, password).");

  const baseUrl = url.replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/web/session/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      id: 1,
      params: { db: database, login: username, password }
    })
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.data?.message || data.error.message || JSON.stringify(data.error));
  if (!data.result || !data.result.uid) throw new Error("Échec de l'authentification Odoo.");

  const cookies = res.headers.get("set-cookie") || "";
  const match = cookies.match(/session_id=([^;]+)/);
  sessionId = match ? match[1] : null;
  return { uid: data.result.uid, sessionId };
}

async function odooCallLogin(opts, model, method, args = [], kwargs = {}) {
  const credentials = (opts && opts.credentials) || {};
  const baseUrl = (credentials.url || "").replace(/\/+$/, "");
  if (!baseUrl) return { ok: false, error: "URL Odoo manquante." };

  if (!sessionId) {
    try {
      await odooAuthenticate(credentials);
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  const headers = { "Content-Type": "application/json" };
  if (sessionId) headers["Cookie"] = `session_id=${sessionId}`;

  let res;
  try {
    res = await fetch(`${baseUrl}/web/dataset/call_kw`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        id: Date.now(),
        params: {
          model,
          method,
          args,
          kwargs: { ...kwargs, context: kwargs.context || {} }
        }
      })
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const data = await res.json();
  if (data.error) {
    if (data.error.code === 100 || (data.error.message && data.error.message.includes("Session"))) {
      sessionId = null;
      try {
        await odooAuthenticate(credentials);
      } catch (e) {
        return { ok: false, error: e.message };
      }
      return odooCallLogin(opts, model, method, args, kwargs);
    }
    return {
      ok: false,
      error: data.error.data?.message || data.error.message || JSON.stringify(data.error)
    };
  }

  return { ok: true, data: data.result };
}

// ── Token mode: Bearer token via JSON-2 API ──

async function odooCallToken(opts, model, method, args = [], kwargs = {}) {
  const credentials = (opts && opts.credentials) || {};
  const baseUrl = (credentials.url || "").replace(/\/+$/, "");
  const apiKey = credentials.apiKey;
  if (!baseUrl) return { ok: false, error: "URL Odoo manquante." };
  if (!apiKey) return { ok: false, error: "Clé API Odoo manquante." };

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Authorization": `bearer ${apiKey}`,
    "User-Agent": "Homeport Odoo Plugin"
  };

  // Build the JSON-2 body from args/kwargs
  const body = {};

  // ids: first element of args if it's an array of numbers
  if (args.length > 0 && Array.isArray(args[0])) {
    body.ids = args[0];
  } else if (args.length > 0 && typeof args[0] === "number") {
    body.ids = [args[0]];
  }

  // Merge kwargs into body (domain, fields, limit, offset, context, etc.)
  for (const [k, v] of Object.entries(kwargs)) {
    body[k] = v;
  }

  // Map positional args to named params for standard ORM methods
  if (method === "create" && args.length > 0) {
    body.vals = args[0];
  } else if (method === "write" && args.length > 1) {
    body.ids = Array.isArray(args[0]) ? args[0] : [args[0]];
    body.vals = args[1];
  } else if (method === "unlink" && args.length > 0) {
    body.ids = Array.isArray(args[0]) ? args[0] : [args[0]];
  }

  let res;
  try {
    res = await fetch(`${baseUrl}/json/2/${model}/${method}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  // JSON-2 returns the result directly on success, or an error object on failure
  if (!res.ok) {
    let errMsg = `Erreur Odoo HTTP ${res.status}`;
    try {
      const errData = await res.json();
      errMsg = errData.message || errData.name || errMsg;
    } catch (_) {}
    return { ok: false, error: errMsg };
  }

  const data = await res.json();
  return { ok: true, data };
}

// ── Router: dispatch to the right method based on type_auth ──

async function odooCall(opts, model, method, args = [], kwargs = {}) {
  const credentials = (opts && opts.credentials) || {};
  const authType = credentials.type_auth || "token";

  if (authType === "token") {
    return odooCallToken(opts, model, method, args, kwargs);
  } else {
    return odooCallLogin(opts, model, method, args, kwargs);
  }
}

module.exports = { utils: { odooCall, odooAuthenticate } };
