const { utils } = require("./utils");

module.exports = {
  async plaid_auth_get(node, msg, inputs, opts) {
    const accessToken = String((inputs && inputs.accessToken) || "").trim();
    if (!accessToken) return { ok: false, error: "Access token requis." };
    const res = await utils.plaidRequest(opts, "/auth/get", { access_token: accessToken });
    if (!res.ok) return res;
    const accounts = ((res.data && res.data.accounts) || []).map((account) => ({ id: account.account_id || "", name: account.name || "", type: account.type || "", subtype: account.subtype || "" }));
    return { ok: true, totalCount: String(accounts.length), accounts, numbers: JSON.stringify((res.data && res.data.numbers) || {}) };
  }
};
