const { utils } = require("./utils");
module.exports = {
  async monday_item_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const boardId = (d.boardId || "").toString().trim();
    const itemId = (d.itemId || "").toString().trim();
    const columnValues = (d.columnValues || "").toString().trim();
    if (!boardId) return { ok: false, error: "Missing boardId." };
    if (!itemId) return { ok: false, error: "Missing itemId." };
    if (!columnValues) return { ok: false, error: "Missing columnValues." };
    const query = `mutation { change_multiple_column_values (board_id: ${boardId}, item_id: ${itemId}, column_values: ${JSON.stringify(columnValues)}) { id name board { id } group { id } state column_values { id text value } created_at updated_at } }`;
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    const r = res.data.change_multiple_column_values || {};
    return { ok: true, id: r.id, name: r.name, board_id: r.board?.id, group_id: r.group?.id, state: r.state, column_values: JSON.stringify(r.column_values || []), created_at: r.created_at, updated_at: r.updated_at };
  }
};
