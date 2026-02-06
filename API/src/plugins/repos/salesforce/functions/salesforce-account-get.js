const { utils } = require("./utils");

module.exports = {
  async salesforce_account_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const accountId = (d.accountId || "").toString().trim();
    if (!accountId) return { ok: false, error: "Missing accountId." };

    const res = await utils.sfRequest(opts, `/sobjects/Account/${encodeURIComponent(accountId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.Id, Name: r.Name, Industry: r.Industry, Phone: r.Phone, Website: r.Website, BillingCity: r.BillingCity, CreatedDate: r.CreatedDate };
  }
};
