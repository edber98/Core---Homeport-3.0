const { utils } = require("./utils");

module.exports = {
  async intercom_contacts_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.perPage) query.per_page = d.perPage;
    if (d.startingAfter) query.starting_after = d.startingAfter;

    log('Récupération de la liste...');
    const res = await utils.intercomRequest(opts, "/contacts", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.data) || [];
    const contacts = items.map(r => ({ id: r.id, type: r.type || r.role, name: r.name || "", email: r.email || "", phone: r.phone || "", role: r.role || "", createdAt: String(r.created_at || "") }));
    return { ok: true, contacts, totalCount: res.data?.total_count || contacts.length, hasMore: !!res.data?.pages?.next };
  }
};
