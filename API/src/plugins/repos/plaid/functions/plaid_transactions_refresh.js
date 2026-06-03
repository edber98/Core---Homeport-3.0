const { utils } = require("./utils");

module.exports = {
  async plaid_transactions_refresh(node, msg, inputs, opts) {
    const accessToken = String((inputs && inputs.accessToken) || "").trim();
    if (!accessToken) return { ok: false, error: "Access token requis." };
    const res = await utils.plaidRequest(opts, "/transactions/refresh", { access_token: accessToken });
    if (!res.ok) return res;
    return { ok: true, requestId: (res.data && res.data.request_id) || "" };
  }
};
