const { utils } = require("./utils");
module.exports = {
  async monday_subitem_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const parentItemId = (d.parentItemId || "").toString().trim();
    const itemName = (d.itemName || "").trim();
    if (!parentItemId) return { ok: false, error: "Missing parentItemId." };
    if (!itemName) return { ok: false, error: "Missing itemName." };
    let colVals = d.columnValues || "";
    if (typeof colVals === "object") colVals = JSON.stringify(colVals);
    let query = `mutation { create_subitem (parent_item_id: ${parentItemId}, item_name: "${itemName}"`;
    if (colVals) query += `, column_values: ${JSON.stringify(colVals)}`;
    query += `) { id name board { id } group { id } state column_values { id text value } created_at updated_at } }`;
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    const r = res.data.create_subitem || {};
    return { ok: true, id: r.id, name: r.name, board_id: r.board?.id, group_id: r.group?.id, state: r.state, column_values: JSON.stringify(r.column_values || []), created_at: r.created_at, updated_at: r.updated_at };
  }
};
