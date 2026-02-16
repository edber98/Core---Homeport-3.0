const { utils } = require("./utils");
module.exports = {
  async monday_columns_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const boardId = (d.boardId || "").toString().trim();
    if (!boardId) return { ok: false, error: "Missing boardId." };
    const query = `{ boards (ids: [${boardId}]) { columns { id title type settings_str } } }`;
    log('Récupération de la liste...');
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    const boards = res.data.boards || [];
    const columns = (boards[0]?.columns || []).map(r => ({ id: r.id, title: r.title, type: r.type, settings_str: r.settings_str }));
    return { ok: true, id: columns[0]?.id, title: columns[0]?.title, type: columns[0]?.type, settings_str: columns[0]?.settings_str, totalCount: columns.length };
  }
};
