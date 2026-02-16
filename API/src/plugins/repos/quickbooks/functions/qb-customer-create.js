const { utils } = require("./utils");

module.exports = {
  async qb_customer_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const displayName = (d.displayName || "").trim();
    if (!displayName) return { ok: false, error: "Missing displayName." };

    const body = { DisplayName: displayName };
    if (d.companyName) body.CompanyName = d.companyName;
    if (d.primaryEmailAddr) body.PrimaryEmailAddr = { Address: d.primaryEmailAddr };
    if (d.primaryPhone) body.PrimaryPhone = { FreeFormNumber: d.primaryPhone };

    log('Création en cours...');
    const res = await utils.qbRequest(opts, "/customer", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Customer) || res.data || {};
    return { ok: true, id: String(r.Id || ""), displayName: r.DisplayName || "", companyName: r.CompanyName || "", primaryEmailAddr: (r.PrimaryEmailAddr && r.PrimaryEmailAddr.Address) || "", primaryPhone: (r.PrimaryPhone && r.PrimaryPhone.FreeFormNumber) || "", balance: String(r.Balance != null ? r.Balance : ""), active: String(r.Active != null ? r.Active : ""), createTime: r.MetaData?.CreateTime || "" };
  }
};
