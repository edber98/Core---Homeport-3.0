const { utils } = require("./utils");

module.exports = {
  async plaid_item_get(node, msg, inputs, opts) {
    const accessToken = String((inputs && inputs.accessToken) || "").trim();
    if (!accessToken) return { ok: false, error: "Access token requis." };
    const res = await utils.plaidRequest(opts, "/item/get", { access_token: accessToken });
    if (!res.ok) return res;
    const item = (res.data && res.data.item) || {};
    return { ok: true, itemId: item.item_id || "", institutionId: item.institution_id || "", webhook: item.webhook || "", error: item.error ? JSON.stringify(item.error) : "" };
  }
};
