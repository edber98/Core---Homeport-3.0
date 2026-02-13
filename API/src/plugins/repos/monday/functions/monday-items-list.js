const { utils } = require("./utils");
module.exports = {
  async monday_items_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const boardId = (d.boardId || "").toString().trim();
    if (!boardId) return { ok: false, error: "Missing boardId." };
    const limit = parseInt(d.limit, 10) || 25;
    const query = `{ boards (ids: [${boardId}]) { items_page (limit: ${limit}) { items { id name board { id } group { id } state column_values { id text value } created_at updated_at } } } }`;
    log('Récupération de la liste...');
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    const boards = res.data.boards || [];
    const rawItems = boards[0]?.items_page?.items || [];
    const items = rawItems.map(r => ({ id: r.id, name: r.name, board_id: r.board?.id, group_id: r.group?.id, state: r.state, column_values: JSON.stringify(r.column_values || []), created_at: r.created_at, updated_at: r.updated_at }));
    return { ok: true, items, totalCount: String(items.length) };
  }
};
