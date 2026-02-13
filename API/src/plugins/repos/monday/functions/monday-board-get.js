const { utils } = require("./utils");
module.exports = {
  async monday_board_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const boardId = (d.boardId || "").toString().trim();
    if (!boardId) return { ok: false, error: "Missing boardId." };
    const query = `{ boards (ids: [${boardId}]) { id name description state board_kind } }`;
    log('Récupération des données...');
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    const boards = res.data.boards || [];
    if (boards.length === 0) return { ok: false, error: "Board not found." };
    const r = boards[0];
    return { ok: true, id: r.id, name: r.name, description: r.description, state: r.state, board_kind: r.board_kind };
  }
};
