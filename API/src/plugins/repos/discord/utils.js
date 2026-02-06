/**
 * Discord Bot API utility - HTTP calls to https://discord.com/api/v10
 */

async function discordRequest(opts, method, path, body = null) {
  const credentials = (opts && opts.credentials) || {};
  const botToken = credentials.botToken;
  if (!botToken) return { ok: false, error: "Token du bot Discord manquant." };

  const options = {
    method,
    headers: {
      "Authorization": `Bot ${botToken}`,
      "Content-Type": "application/json"
    }
  };
  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`https://discord.com/api/v10${path}`, options);
  } catch (e) { return { ok: false, error: e.message }; }

  if (res.status === 204) return { ok: true, data: { success: true } };

  let data;
  try {
    data = await res.json();
  } catch (e) { return { ok: false, error: "Réponse invalide de Discord." }; }

  if (!res.ok) return { ok: false, error: data.message || "Discord API error", details: data };
  return { ok: true, data };
}

module.exports = { utils: { discordRequest } };
