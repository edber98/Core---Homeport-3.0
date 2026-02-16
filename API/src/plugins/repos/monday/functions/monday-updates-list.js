const { utils } = require("./utils");
module.exports = {
  async monday_updates_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const itemId = (d.itemId || "").toString().trim();
    if (!itemId) return { ok: false, error: "Missing itemId." };
    const limit = parseInt(d.limit, 10) || 25;
    const query = `{ items (ids: [${itemId}]) { updates (limit: ${limit}) { id body creator_id created_at } } }`;
    log('Mise à jour en cours...');
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    const items = res.data.items || [];
    const updates = (items[0]?.updates || []).map(r => ({ id: r.id, body: r.body, creator_id: r.creator_id, created_at: r.created_at }));
    return { ok: true, updates, totalCount: String(updates.length) };
  }
};
