const { utils } = require("./utils");

module.exports = {
  async mc_list_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const listId = (d.listId || "").trim();
    if (!listId) return { ok: false, error: "Missing listId." };

    const res = await utils.mailchimpRequest(opts, `/lists/${listId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id || "", name: r.name || "", memberCount: String(r.stats?.member_count || 0), dateCreated: r.date_created || "" };
  }
};
