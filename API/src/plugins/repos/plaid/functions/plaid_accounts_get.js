const { utils } = require("./utils");

module.exports = {
  async plaid_accounts_get(node, msg, inputs, opts) {
    const accessToken = String((inputs && inputs.accessToken) || "").trim();
    if (!accessToken) return { ok: false, error: "Access token requis." };
    const res = await utils.plaidRequest(opts, "/accounts/get", { access_token: accessToken });
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
