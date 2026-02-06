/**
 * Telegram Bot API utility - HTTP calls to https://api.telegram.org/bot{token}/{method}
 */

async function telegramRequest(opts, method, body = {}) {
  const credentials = (opts && opts.credentials) || {};
  const botToken = credentials.botToken;
  if (!botToken) return { ok: false, error: "Token du bot Telegram manquant." };

  let res;
  try {
    res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (e) { return { ok: false, error: e.message }; }

  const data = await res.json();
  if (!data.ok) return { ok: false, error: data.description || "Telegram API error", details: data };
  return { ok: true, data: data.result };
}

module.exports = { utils: { telegramRequest } };
