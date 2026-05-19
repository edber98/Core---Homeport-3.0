const { utils } = require("./utils");

function parseCsv(value) {
  return String(value || "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

module.exports = {
  async brevo_webhook_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.url) return { ok: false, error: "URL requise." };

    const body = { url: String(d.url).trim() };
    if (d.type) body.type = d.type;
    if (d.description) body.description = d.description;
    if (d.events) body.events = parseCsv(d.events);
    if (d.batched !== undefined && d.batched !== "") body.batched = d.batched === true || d.batched === "true";

    log("Création du webhook...");
    const res = await utils.brevoRequest(opts, "/webhooks", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: String(res.data?.id || ""), url: body.url, type: body.type || "", description: body.description || "", events: (body.events || []).join(","), batched: String(Boolean(body.batched)) };
  }
};
