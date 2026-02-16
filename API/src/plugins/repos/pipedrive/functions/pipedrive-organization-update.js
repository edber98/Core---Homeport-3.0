const { utils } = require("./utils");

module.exports = {
  async pipedrive_organization_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const orgId = (d.orgId || "").toString().trim();
    if (!orgId) return { ok: false, error: "Missing orgId." };

    const body = {};
    if (d.name) body.name = d.name;
    if (d.address) body.address = d.address;

    if (Object.keys(body).length === 0) return { ok: false, error: "No fields to update." };

    log('Mise à jour en cours...');
    const res = await utils.pdRequest(opts, `/organizations/${encodeURIComponent(orgId)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, name: r.name, address: r.address, people_count: r.people_count, add_time: r.add_time };
  }
};
