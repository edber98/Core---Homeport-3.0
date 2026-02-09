const { utils } = require("./utils");
module.exports = {
  async monday_column_create_value(node, msg, inputs, opts) {
    const d = inputs || {};
    const boardId = (d.boardId || "").toString().trim();
    const itemId = (d.itemId || "").toString().trim();
    const columnId = (d.columnId || "").trim();
    const value = (d.value || "").trim();
    if (!boardId) return { ok: false, error: "Missing boardId." };
    if (!itemId) return { ok: false, error: "Missing itemId." };
    if (!columnId) return { ok: false, error: "Missing columnId." };
    if (!value) return { ok: false, error: "Missing value." };
    const query = `mutation { change_simple_column_value (board_id: ${boardId}, item_id: ${itemId}, column_id: "${columnId}", value: ${JSON.stringify(value)}) { id } }`;
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    return { ok: true, status: "created", message: `Column value set for item ${itemId}.` };
  }
};
