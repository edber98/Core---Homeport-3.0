const { utils } = require("./utils");
module.exports = {
  async monday_group_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const boardId = (d.boardId || "").toString().trim();
    const groupName = (d.groupName || "").trim();
    if (!boardId) return { ok: false, error: "Missing boardId." };
    if (!groupName) return { ok: false, error: "Missing groupName." };
    let query = `mutation { create_group (board_id: ${boardId}, group_name: "${groupName}"`;
    if (d.groupColor) query += `, group_color: "${d.groupColor}"`;
    query += `) { id title color } }`;
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    const r = res.data.create_group || {};
    return { ok: true, id: r.id, title: r.title, color: r.color };
  }
};
