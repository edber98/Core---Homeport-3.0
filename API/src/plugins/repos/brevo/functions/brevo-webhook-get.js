const { utils } = require("./utils");

function mapWebhook(webhook) {
  const w = webhook || {};
  return {
    id: String(w.id || ""),
    url: w.url || "",
    type: w.type || "",
    description: w.description || "",
    events: Array.isArray(w.events) ? w.events.join(",") : "",
    batched: String(Boolean(w.batched)),
    createdAt: w.createdAt || "",
    modifiedAt: w.modifiedAt || ""
  };
}

module.exports = {
  async brevo_webhook_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const webhookId = parseInt(d.webhookId, 10);
    if (isNaN(webhookId)) return { ok: false, error: "ID du webhook requis." };

    log("Récupération du webhook...");
    const res = await utils.brevoRequest(opts, `/webhooks/${webhookId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...mapWebhook(res.data) };
  }
};
