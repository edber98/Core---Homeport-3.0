const { utils } = require("./utils");

module.exports = {
  async pipedrive_notes_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 10;
    const start = parseInt(d.start, 10) || 0;

    const res = await utils.pdRequest(opts, "/notes", { query: { limit, start } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    const notes = results.map(r => ({ id: r.id, content: r.content, deal_id: r.deal_id, person_id: r.person_id, org_id: r.org_id, add_time: r.add_time }));
    return { ok: true, notes };
  }
};
