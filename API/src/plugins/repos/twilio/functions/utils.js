/**
 * Twilio API utility - HTTP calls to https://api.twilio.com/2010-04-01/Accounts/{accountSid}
 * NOTE: Twilio uses form-urlencoded body (not JSON). Responses are JSON with .json suffix on URLs.
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

async function twilioRequest(opts, method, path, body = null) {
  const credentials = (opts && opts.credentials) || {};
  const accountSid = credentials.accountSid;
  const authToken = credentials.authToken;
  if (!accountSid || !authToken) return { ok: false, error: "Identifiants Twilio manquants (accountSid ou authToken)." };

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const options = {
    method,
    headers: {
      "Authorization": `Basic ${auth}`
    }
  };

  if (body && (method === "POST" || method === "PUT")) {
    options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    }
    options.body = params.toString();
  }

  const baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;
  let res;
  try {
    res = await fetch(`${baseUrl}${path}.json`, options);
  } catch (e) { return { ok: false, error: e.message }; }

  let data;
  try {
    data = await readJsonResponse(res);
  } catch (e) { return { ok: false, error: "Réponse invalide de Twilio." }; }

  if (!res.ok) return { ok: false, error: data.message || "Twilio API error", details: data };
  return { ok: true, ...(data || {}) };
}

async function twilioLookupRequest(opts, path) {
  const credentials = (opts && opts.credentials) || {};
  const accountSid = credentials.accountSid;
  const authToken = credentials.authToken;
  if (!accountSid || !authToken) return { ok: false, error: "Identifiants Twilio manquants." };

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  let res;
  try {
    res = await fetch(`https://lookups.twilio.com/v2${path}`, {
      method: "GET",
      headers: { "Authorization": `Basic ${auth}` }
    });
  } catch (e) { return { ok: false, error: e.message }; }

  let data;
  try { data = await readJsonResponse(res); } catch (e) { return { ok: false, error: "Réponse invalide." }; }
  if (!res.ok) return { ok: false, error: data.message || "Lookup API error", details: data };
  return { ok: true, ...(data || {}) };
}

async function twilioVerifyRequest(opts, method, path, body = null) {
  const credentials = (opts && opts.credentials) || {};
  const accountSid = credentials.accountSid;
  const authToken = credentials.authToken;
  if (!accountSid || !authToken) return { ok: false, error: "Identifiants Twilio manquants." };

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const options = {
    method,
    headers: { "Authorization": `Basic ${auth}` }
  };

  if (body && (method === "POST" || method === "PUT")) {
    options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    }
    options.body = params.toString();
  }

  let res;
  try {
    res = await fetch(`https://verify.twilio.com/v2${path}`, options);
  } catch (e) { return { ok: false, error: e.message }; }

  let data;
  try { data = await readJsonResponse(res); } catch (e) { return { ok: false, error: "Réponse invalide." }; }
  if (!res.ok) return { ok: false, error: data.message || "Verify API error", details: data };
  return { ok: true, ...(data || {}) };
}

module.exports = { utils: { twilioRequest, twilioLookupRequest, twilioVerifyRequest, readJsonResponse } };
