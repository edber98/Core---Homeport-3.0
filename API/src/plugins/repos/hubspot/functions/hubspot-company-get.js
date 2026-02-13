const { utils } = require("./utils");

module.exports = {
  async hubspot_company_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const companyId = (d.companyId || "").toString().trim();
    if (!companyId) return { ok: false, error: "Missing companyId." };

    const props = "name,domain,industry,phone";
    log('Récupération des données...');
    const res = await utils.hubspotRequest(opts, `/crm/v3/objects/companies/${encodeURIComponent(companyId)}`, {
      query: { properties: props }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, ...r.properties, createdate: r.createdAt };
  }
};
