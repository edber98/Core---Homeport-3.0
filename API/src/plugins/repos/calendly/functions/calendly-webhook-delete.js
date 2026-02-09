const { utils } = require("./utils");

module.exports = {
  async calendly_webhook_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.webhookUuid || "").trim()) return { ok: false, error: "Missing webhookUuid." };

    const res = await utils.calendlyRequest(opts, `/webhook_subscriptions/${d.webhookUuid}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: "Webhook supprimé." };
  }
};
