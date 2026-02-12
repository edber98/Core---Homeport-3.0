const { utils } = require("./utils");
module.exports = {
  async monday_boards_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 25;
    const query = `{ boards (limit: ${limit}) { id name description state board_kind } }`;
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    const boards = (res.data.boards || []).map(r => ({ id: r.id, name: r.name, description: r.description, state: r.state, board_kind: r.board_kind }));
    return { ok: true, boards, totalCount: String(boards.length) };
  }
};
