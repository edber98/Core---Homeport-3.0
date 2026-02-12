const { utils } = require("./utils");

module.exports = {
  async hubspot_contacts_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 10;
    const query = { limit, properties: "email,firstname,lastname,phone,company" };
    if (d.after) query.after = d.after;

    const res = await utils.hubspotRequest(opts, "/crm/v3/objects/contacts", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.results) || [];
    const paging = res.data && res.data.paging;
    const hasMore = !!(paging && paging.next);
    const nextAfter = (paging && paging.next && paging.next.after) || null;
    const contacts = results.map(r => ({ id: r.id, ...r.properties, createdate: r.createdAt }));
    return { ok: true, contacts, hasMore, nextAfter };
  }
};
