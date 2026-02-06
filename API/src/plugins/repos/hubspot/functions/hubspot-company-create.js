const { utils } = require("./utils");

module.exports = {
  async hubspot_company_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const name = (d.name || "").trim();
    if (!name) return { ok: false, error: "Missing name." };

    const properties = { name };
    if (d.domain) properties.domain = d.domain;
    if (d.industry) properties.industry = d.industry;
    if (d.phone) properties.phone = d.phone;

    const res = await utils.hubspotRequest(opts, "/crm/v3/objects/companies", {
      method: "POST",
      body: { properties }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, ...r.properties, createdate: r.createdAt };
  }
};
