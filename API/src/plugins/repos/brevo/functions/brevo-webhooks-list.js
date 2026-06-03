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
  async brevo_webhooks_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};

    log("Liste des webhooks...");
    const res = await utils.brevoRequest(opts, "/webhooks", {
      query: { type: d.type || "transactional", sort: d.sort || "desc" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const webhooks = Array.isArray(res.data?.webhooks) ? res.data.webhooks.map(mapWebhook) : [];
    return { ok: true, webhooks, totalCount: String(webhooks.length) };
  }
};
