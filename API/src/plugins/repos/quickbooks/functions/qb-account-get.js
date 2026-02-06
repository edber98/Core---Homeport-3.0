const { utils } = require("./utils");

module.exports = {
  async qb_account_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const accountId = (d.accountId || "").toString().trim();
    if (!accountId) return { ok: false, error: "Missing accountId." };

    const res = await utils.qbRequest(opts, `/account/${encodeURIComponent(accountId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Account) || res.data || {};
    return { ok: true, id: String(r.Id || ""), name: r.Name || "", accountType: r.AccountType || "", accountSubType: r.AccountSubType || "", currentBalance: String(r.CurrentBalance != null ? r.CurrentBalance : ""), active: String(r.Active != null ? r.Active : "") };
  }
};
