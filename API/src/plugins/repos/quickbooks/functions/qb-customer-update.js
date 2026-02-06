const { utils } = require("./utils");

module.exports = {
  async qb_customer_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const customerId = (d.customerId || "").toString().trim();
    if (!customerId) return { ok: false, error: "Missing customerId." };

    const getRes = await utils.qbRequest(opts, `/customer/${encodeURIComponent(customerId)}`);
    if (!getRes.ok) return { ok: false, error: getRes.error, status: getRes.status, details: getRes.details };

    const existing = (getRes.data && getRes.data.Customer) || getRes.data || {};
    const body = { Id: customerId, SyncToken: existing.SyncToken, sparse: true };
    if (d.displayName) body.DisplayName = d.displayName;
    if (d.companyName) body.CompanyName = d.companyName;
    if (d.primaryEmailAddr) body.PrimaryEmailAddr = { Address: d.primaryEmailAddr };
    if (d.primaryPhone) body.PrimaryPhone = { FreeFormNumber: d.primaryPhone };

    const res = await utils.qbRequest(opts, "/customer", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Customer) || res.data || {};
    return { ok: true, id: String(r.Id || ""), displayName: r.DisplayName || "", companyName: r.CompanyName || "", primaryEmailAddr: (r.PrimaryEmailAddr && r.PrimaryEmailAddr.Address) || "", primaryPhone: (r.PrimaryPhone && r.PrimaryPhone.FreeFormNumber) || "", balance: String(r.Balance != null ? r.Balance : ""), active: String(r.Active != null ? r.Active : ""), createTime: r.MetaData?.CreateTime || "" };
  }
};
