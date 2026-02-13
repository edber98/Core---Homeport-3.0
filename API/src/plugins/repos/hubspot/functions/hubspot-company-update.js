const { utils } = require("./utils");

module.exports = {
  async hubspot_company_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const companyId = (d.companyId || "").toString().trim();
    if (!companyId) return { ok: false, error: "Missing companyId." };

    const properties = {};
    if (d.name) properties.name = d.name;
    if (d.domain) properties.domain = d.domain;
    if (d.industry) properties.industry = d.industry;

    if (Object.keys(properties).length === 0) return { ok: false, error: "No fields to update." };

    log('Mise à jour en cours...');
    const res = await utils.hubspotRequest(opts, `/crm/v3/objects/companies/${encodeURIComponent(companyId)}`, {
      method: "PATCH",
      body: { properties }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, ...r.properties, createdate: r.createdAt };
  }
};
