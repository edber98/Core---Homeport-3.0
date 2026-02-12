/**
 * Odoo JSON-RPC 2.0 utilities
 * All Odoo API calls use JSON-RPC, NOT REST.
 */

let sessionId = null;

async function odooAuthenticate(credentials) {
  const { url, database, username, apiKey } = credentials;
  if (!url || !database || !username || !apiKey) throw new Error("Missing Odoo credentials.");
console.log("body :",JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      id: 1,
      params: { db: database, login: username, password: apiKey }
    }))
  const baseUrl = url.replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/web/session/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      id: 1,
      params: { db: database, login: username, password: apiKey }
    })
  });
  
  const data = await res.json();
  console.log("odoores", data, res.headers.get("set-cookie") || "non cookie")
  if (data.error) throw new Error(data.error.data.message || data.error.message || JSON.stringify(data.error));
  if (!data.result || !data.result.uid) throw new Error("Authentication failed.");

  // Extract session cookie
  const cookies = res.headers.get("set-cookie") || "";
  const match = cookies.match(/session_id=([^;]+)/);
  sessionId = match ? match[1] : null;
  console.log("odooCookie", cookies)
  return { uid: data.result.uid, sessionId };
}

async function odooCall(opts, model, method, args = [], kwargs = {}) {
  const credentials = (opts && opts.credentials) || {};
  const baseUrl = (credentials.url || "").replace(/\/+$/, "");
  if (!baseUrl) return { ok: false, error: "Missing Odoo URL." };

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
    // Session expired? Re-auth once
    if (data.error.code === 100 || (data.error.message && data.error.message.includes("Session"))) {
      sessionId = null;
      try {
        await odooAuthenticate(credentials);
      } catch (e) {
        return { ok: false, error: e.message };
      }
      return odooCall(opts, model, method, args, kwargs);
    }
    return {
      ok: false,
      error: data.error.data?.message || data.error.message || JSON.stringify(data.error)
    };
  }

  return { ok: true, data: data.result };
}

module.exports = { utils: { odooCall, odooAuthenticate } };
