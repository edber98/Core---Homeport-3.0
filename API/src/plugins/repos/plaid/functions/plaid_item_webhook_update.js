const { utils } = require("./utils");

module.exports = {
  async plaid_item_webhook_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.accessToken) return { ok: false, error: "Access token requis." };
    if (!d.webhook) return { ok: false, error: "URL webhook requise." };
    const res = await utils.plaidRequest(opts, "/item/webhook/update", { access_token: d.accessToken, webhook: d.webhook });
    if (!res.ok) return res;
    const item = (res.data && res.data.item) || {};
    return { ok: true, itemId: item.item_id || "", webhook: item.webhook || d.webhook };
  }
};
