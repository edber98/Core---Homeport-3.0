const { utils } = require("./utils");

module.exports = {
  async pipedrive_organization_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const name = (d.name || "").trim();
    if (!name) return { ok: false, error: "Missing name." };

    const body = { name };
    if (d.address) body.address = d.address;

    const res = await utils.pdRequest(opts, "/organizations", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, name: r.name, address: r.address, people_count: r.people_count, add_time: r.add_time };
  }
};
