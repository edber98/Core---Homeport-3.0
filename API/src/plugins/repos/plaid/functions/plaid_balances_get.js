const { utils } = require("./utils");

module.exports = {
  async plaid_balances_get(node, msg, inputs, opts) {
    const accessToken = String((inputs && inputs.accessToken) || "").trim();
    if (!accessToken) return { ok: false, error: "Access token requis." };
    const body = { access_token: accessToken };
    if (inputs && inputs.accountIds) body.options = { account_ids: utils.list(inputs.accountIds, []) };
    const res = await utils.plaidRequest(opts, "/accounts/balance/get", body);
    if (!res.ok) return res;
    const accounts = ((res.data && res.data.accounts) || []).map((account) => ({
      id: account.account_id || "",
      name: account.name || "",
      officialName: account.official_name || "",
      type: account.type || "",
      subtype: account.subtype || "",
      current: account.balances ? account.balances.current : "",
      available: account.balances ? account.balances.available : "",
      currency: account.balances ? (account.balances.iso_currency_code || account.balances.unofficial_currency_code || "") : ""
    }));
    return { ok: true, totalCount: String(accounts.length), accounts };
  }
};
