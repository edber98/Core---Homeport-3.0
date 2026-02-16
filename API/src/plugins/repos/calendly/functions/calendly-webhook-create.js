const { utils } = require("./utils");

module.exports = {
  async calendly_webhook_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.url || "").trim()) return { ok: false, error: "Missing URL." };
    if (!(d.events || "").trim()) return { ok: false, error: "Missing events." };

    const me = await utils.calendlyRequest(opts, "/users/me");
    if (!me.ok) return { ok: false, error: me.error };
    const userUri = me.data?.resource?.uri;
    const orgUri = me.data?.resource?.current_organization;
    const scope = d.scope || "user";

    const body = { url: d.url, events: d.events.split(",").map(e => e.trim()), scope };
    if (scope === "user") body.user = userUri;
    if (scope === "organization") body.organization = orgUri;

    log('Création en cours...');
    const res = await utils.calendlyRequest(opts, "/webhook_subscriptions", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "created", message: res.data?.resource?.uri || "Webhook créé." };
  }
};
