async function chatWebhookRequest(opts, body) {
  const credentials = (opts && opts.credentials) || {};
  const webhookUrl = credentials.webhookUrl;
  if (!webhookUrl) return { ok: false, error: "Missing webhookUrl." };

  let res;
  try {
    res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(body)
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }

  if (!res.ok) {
    return { ok: false, error: data?.error?.message || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

module.exports = { utils: { chatWebhookRequest } };
