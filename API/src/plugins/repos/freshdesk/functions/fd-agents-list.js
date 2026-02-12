const { utils } = require("./utils");

module.exports = {
  async fd_agents_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.page) query.page = parseInt(d.page, 10);

    const res = await utils.freshdeskRequest(opts, "/agents", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = res.data || [];
    const agents = results.map(r => {
      const contact = r.contact || {};
      return { id: String(r.id || ""), name: contact.name || "", email: contact.email || "", active: String(r.active || false) };
    });
    return { ok: true, totalCount: res.totalCount || 0, agents };
  }
};
