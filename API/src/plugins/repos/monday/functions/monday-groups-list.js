const { utils } = require("./utils");
module.exports = {
  async monday_groups_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const boardId = (d.boardId || "").toString().trim();
    if (!boardId) return { ok: false, error: "Missing boardId." };
    const query = `{ boards (ids: [${boardId}]) { groups { id title color } } }`;
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    const boards = res.data.boards || [];
    const groups = (boards[0]?.groups || []).map(r => ({ id: r.id, title: r.title, color: r.color }));
    return { ok: true, groups };
  }
};
