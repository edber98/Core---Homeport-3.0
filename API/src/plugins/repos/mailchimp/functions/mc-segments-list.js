const { utils } = require("./utils");

module.exports = {
  async mc_segments_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.listId) return { ok: false, error: "Missing listId." };

    log('Récupération de la liste...');
    const res = await utils.mailchimpRequest(opts, `/lists/${d.listId}/segments`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.segments) || [];
    const segments = results.map(r => ({ id: String(r.id || ""), name: r.name || "", memberCount: String(r.member_count || 0), createdAt: r.created_at || "" }));
    return { ok: true, segments, totalCount: res.data?.total_items || 0 };
  }
};
