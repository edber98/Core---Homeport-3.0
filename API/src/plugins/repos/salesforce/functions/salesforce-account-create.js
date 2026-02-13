const { utils } = require("./utils");

module.exports = {
  async salesforce_account_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const Name = (d.Name || "").trim();
    if (!Name) return { ok: false, error: "Missing Name." };

    const body = { Name };
    if (d.Industry) body.Industry = d.Industry;
    if (d.Phone) body.Phone = d.Phone;
    if (d.Website) body.Website = d.Website;

    log('Création en cours...');
    const res = await utils.sfRequest(opts, "/sobjects/Account", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const getRes = await utils.sfRequest(opts, `/sobjects/Account/${res.data.id}`);
    if (!getRes.ok) return { ok: true, id: res.data.id };
    const r = getRes.data || {};
    return { ok: true, id: r.Id, Name: r.Name, Industry: r.Industry, Phone: r.Phone, Website: r.Website, BillingCity: r.BillingCity, CreatedDate: r.CreatedDate };
  }
};
