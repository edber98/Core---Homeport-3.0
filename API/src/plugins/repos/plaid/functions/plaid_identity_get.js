const { utils } = require("./utils");

module.exports = {
  async plaid_identity_get(node, msg, inputs, opts) {
    const accessToken = String((inputs && inputs.accessToken) || "").trim();
    if (!accessToken) return { ok: false, error: "Access token requis." };
    const res = await utils.plaidRequest(opts, "/identity/get", { access_token: accessToken });
    if (!res.ok) return res;
    const accounts = ((res.data && res.data.accounts) || []).map((account) => ({ id: account.account_id || "", name: account.name || "", owners: JSON.stringify(account.owners || []) }));
    return { ok: true, totalCount: String(accounts.length), accounts };
  }
};
