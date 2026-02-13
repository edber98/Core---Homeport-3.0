const { utils } = require("./utils");

module.exports = {
  async hubspot_deal_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const dealId = (d.dealId || "").toString().trim();
    if (!dealId) return { ok: false, error: "Missing dealId." };

    const props = "dealname,amount,pipeline,dealstage,closedate";
    log('Récupération des données...');
    const res = await utils.hubspotRequest(opts, `/crm/v3/objects/deals/${encodeURIComponent(dealId)}`, {
      query: { properties: props }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, ...r.properties, createdate: r.createdAt };
  }
};
