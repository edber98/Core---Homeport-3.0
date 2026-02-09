const { utils } = require("./utils");
module.exports = {
  async monday_item_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const itemId = (d.itemId || "").toString().trim();
    if (!itemId) return { ok: false, error: "Missing itemId." };
    const query = `{ items (ids: [${itemId}]) { id name board { id } group { id } state column_values { id text value } created_at updated_at } }`;
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    const items = res.data.items || [];
    if (items.length === 0) return { ok: false, error: "Item not found." };
    const r = items[0];
    return { ok: true, id: r.id, name: r.name, board_id: r.board?.id, group_id: r.group?.id, state: r.state, column_values: JSON.stringify(r.column_values || []), created_at: r.created_at, updated_at: r.updated_at };
  }
};
