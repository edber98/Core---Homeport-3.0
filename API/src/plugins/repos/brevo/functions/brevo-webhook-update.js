const { utils } = require("./utils");

function parseCsv(value) {
  return String(value || "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

module.exports = {
  async brevo_webhook_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const webhookId = parseInt(d.webhookId, 10);
    if (isNaN(webhookId)) return { ok: false, error: "ID du webhook requis." };

    const body = {};
    if (d.url) body.url = String(d.url).trim();
    if (d.type) body.type = d.type;
    if (d.description) body.description = d.description;
    if (d.events) body.events = parseCsv(d.events);
    if (d.batched !== undefined && d.batched !== "") body.batched = d.batched === true || d.batched === "true";
    if (!Object.keys(body).length) return { ok: false, error: "Aucun champ à mettre à jour." };

    log("Mise à jour du webhook...");
    const res = await utils.brevoRequest(opts, `/webhooks/${webhookId}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "updated", message: `Webhook ${webhookId} mis à jour.` };
  }
};
