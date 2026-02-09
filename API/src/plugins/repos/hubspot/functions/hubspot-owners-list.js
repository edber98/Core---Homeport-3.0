const { utils } = require("./utils");

module.exports = {
  async hubspot_owners_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 100;
    const query = { limit };
    if (d.after) query.after = d.after;
    if (d.email) query.email = d.email;

    const res = await utils.hubspotRequest(opts, "/crm/v3/owners", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.results) || [];
    const owners = results.map(o => ({
      id: o.id,
      email: o.email,
      firstName: o.firstName,
      lastName: o.lastName
    }));
    return { ok: true, owners };
  }
};
