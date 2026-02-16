const { utils } = require("./utils");

module.exports = {
  async hubspot_deal_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const dealId = (d.dealId || "").toString().trim();
    if (!dealId) return { ok: false, error: "Missing dealId." };

    const properties = {};
    if (d.dealname) properties.dealname = d.dealname;
    if (d.amount) properties.amount = d.amount;
    if (d.dealstage) properties.dealstage = d.dealstage;

    if (Object.keys(properties).length === 0) return { ok: false, error: "No fields to update." };

    log('Mise à jour en cours...');
    const res = await utils.hubspotRequest(opts, `/crm/v3/objects/deals/${encodeURIComponent(dealId)}`, {
      method: "PATCH",
      body: { properties }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, ...r.properties, createdate: r.createdAt };
  }
};
