const { utils } = require("./utils");
module.exports = {
  async notion_comments_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const blockId = (d.blockId || "").trim();
    if (!blockId) return { ok: false, error: "Missing blockId." };
    const pageSize = parseInt(d.pageSize, 10) || 100;
    log('Récupération de la liste...');
    const res = await utils.notionRequest(opts, "/comments", { query: { block_id: blockId, page_size: pageSize } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const results = (res.data && res.data.results) || [];
    const comments = results.map(r => ({ id: r.id, discussion_id: r.discussion_id, rich_text: r.rich_text?.map(t => t.plain_text).join("") || "", created_time: r.created_time }));
    return { ok: true, comments, hasMore: !!res.data?.has_more, nextCursor: res.data?.next_cursor || "" };
  }
};
