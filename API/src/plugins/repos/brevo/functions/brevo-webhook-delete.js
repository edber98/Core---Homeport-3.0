const { utils } = require("./utils");

module.exports = {
  async brevo_webhook_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const webhookId = parseInt(d.webhookId, 10);
    if (isNaN(webhookId)) return { ok: false, error: "ID du webhook requis." };

    log("Suppression du webhook...");
    const res = await utils.brevoRequest(opts, `/webhooks/${webhookId}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: `Webhook ${webhookId} supprimé.` };
  }
};
