const { utils } = require("./utils");

module.exports = {
  async pipedrive_organization_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const orgId = (d.orgId || "").toString().trim();
    if (!orgId) return { ok: false, error: "Missing orgId." };

    log('Récupération des données...');
    const res = await utils.pdRequest(opts, `/organizations/${encodeURIComponent(orgId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, name: r.name, address: r.address, people_count: r.people_count, add_time: r.add_time };
  }
};
