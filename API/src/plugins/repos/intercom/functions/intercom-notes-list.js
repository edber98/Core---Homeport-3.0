const { utils } = require("./utils");

module.exports = {
  async intercom_notes_list(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.contactId || "").trim()) return { ok: false, error: "Missing contactId." };

    const query = {};
    if (d.perPage) query.per_page = d.perPage;
    if (d.startingAfter) query.starting_after = d.startingAfter;

    const res = await utils.intercomRequest(opts, `/contacts/${d.contactId}/notes`, { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.data) || [];
    const notes = items.map(r => ({ id: r.id, body: r.body || "", author: r.author?.name || "", createdAt: String(r.created_at || "") }));
    return { ok: true, notes };
  }
};
