/**
 * WhatsApp Business Cloud API utility - HTTP calls to https://graph.facebook.com/v18.0
 */

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
    data = await res.json();
  } catch (e) { return { ok: false, error: "Réponse invalide de WhatsApp." }; }

  if (data.error) return { ok: false, error: data.error.message || "WhatsApp API error", details: data.error };
  return { ok: true, data };
}

function getPhoneNumberId(opts) {
  const credentials = (opts && opts.credentials) || {};
  return credentials.phoneNumberId || "";
}

module.exports = { utils: { whatsappRequest, getPhoneNumberId } };
