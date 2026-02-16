const { utils } = require("./utils");

module.exports = {
  async calendly_webhooks_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const me = await utils.calendlyRequest(opts, "/users/me");
    if (!me.ok) return { ok: false, error: me.error };
    const userUri = me.data?.resource?.uri;
    const orgUri = me.data?.resource?.current_organization;
    const scope = d.scope || "user";

    const query = { scope, organization: orgUri };
    if (scope === "user") query.user = userUri;

    log('Récupération de la liste...');
    const res = await utils.calendlyRequest(opts, "/webhook_subscriptions", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "success", message: JSON.stringify((res.data?.collection || []).map(w => ({ uri: w.uri, callbackUrl: w.callback_url, events: w.events, state: w.state }))) };
  }
};
