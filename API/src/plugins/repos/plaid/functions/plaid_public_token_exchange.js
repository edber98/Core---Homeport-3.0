const { utils } = require("./utils");

module.exports = {
  async plaid_public_token_exchange(node, msg, inputs, opts) {
    const publicToken = String((inputs && inputs.publicToken) || "").trim();
    if (!publicToken) return { ok: false, error: "Public token requis." };
    const res = await utils.plaidRequest(opts, "/item/public_token/exchange", { public_token: publicToken });
    if (!res.ok) return res;
    const data = res.data || {};
    return { ok: true, accessToken: data.access_token || "", itemId: data.item_id || "", requestId: data.request_id || "" };
  }
};
