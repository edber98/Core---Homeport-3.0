const { utils } = require("./utils");

module.exports = {
  async pipedrive_organizations_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 10;
    const start = parseInt(d.start, 10) || 0;

    const res = await utils.pdRequest(opts, "/organizations", { query: { limit, start } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    const organizations = results.map(r => ({ id: r.id, name: r.name, address: r.address, people_count: r.people_count, add_time: r.add_time }));
    return { ok: true, organizations };
  }
};
