const { utils } = require("./utils");

module.exports = {
  async salesforce_account_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const accountId = (d.accountId || "").toString().trim();
    if (!accountId) return { ok: false, error: "Missing accountId." };

    const body = {};
    if (d.Name) body.Name = d.Name;
    if (d.Industry) body.Industry = d.Industry;
    if (d.Phone) body.Phone = d.Phone;
    if (d.Website) body.Website = d.Website;

    if (Object.keys(body).length === 0) return { ok: false, error: "No fields to update." };

    log('Mise à jour en cours...');
    const res = await utils.sfRequest(opts, `/sobjects/Account/${encodeURIComponent(accountId)}`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const getRes = await utils.sfRequest(opts, `/sobjects/Account/${encodeURIComponent(accountId)}`);
    if (!getRes.ok) return { ok: true, id: accountId, status: "updated" };
    const r = getRes.data || {};
    return { ok: true, id: r.Id, Name: r.Name, Industry: r.Industry, Phone: r.Phone, Website: r.Website, BillingCity: r.BillingCity, CreatedDate: r.CreatedDate };
  }
};
