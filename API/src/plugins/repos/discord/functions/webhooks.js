module.exports = {
  async discord_execute_webhook(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const args = inputs || {};
    const webhookUrl = args.webhook_url || "";
    if (!webhookUrl) return { ok: false, error: "URL du webhook manquante." };

    const body = {};
    if (args.content !== undefined && args.content !== null && args.content !== "") body.content = args.content;
    if (args.username !== undefined && args.username !== null && args.username !== "") body.username = args.username;
    if (args.avatar_url !== undefined && args.avatar_url !== null && args.avatar_url !== "") body.avatar_url = args.avatar_url;
    if (args.embed_json !== undefined && args.embed_json !== null && args.embed_json !== "") {
      try { body.embeds = JSON.parse(args.embed_json); } catch (e) { /* ignore */ }
    }

    let res;
    try {
      log('Exécution en cours...');
      res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    } catch (e) { return { ok: false, error: e.message }; }

    if (res.status === 204) return { ok: true, status: "success", message: "Webhook exécuté avec succès" };

    let data;
    try {
      data = await res.json();
    } catch (e) { return { ok: true, status: "success", message: "Webhook exécuté avec succès" }; }

    if (!res.ok) return { ok: false, error: data.message || "Webhook error", details: data };
    return { ok: true, ...(data || {}) };
  }
};
