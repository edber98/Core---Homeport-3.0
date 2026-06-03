const { utils } = require("./utils");
module.exports = {
  async dbx_list_folder_continue(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.cursor) return { ok: false, error: "Cursor requis." };
    const res = await utils.dbxRequest(opts, "/files/list_folder/continue", { cursor: d.cursor });
    if (!res.ok) return res;
    const entries = Array.isArray(res.data?.entries) ? res.data.entries : [];
    return { ok: true, files: entries.map(utils.mapEntry), totalCount: entries.length, nextCursor: res.data?.cursor || "", hasMore: !!res.data?.has_more, result_json: JSON.stringify(res.data || {}) };
  }
};
