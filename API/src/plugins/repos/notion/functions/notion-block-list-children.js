const { utils } = require("./utils");
module.exports = {
  async notion_block_list_children(node, msg, inputs, opts) {
    const d = inputs || {};
    const blockId = (d.blockId || "").trim();
    if (!blockId) return { ok: false, error: "Missing blockId." };
    const pageSize = parseInt(d.pageSize, 10) || 100;
    const res = await utils.notionRequest(opts, `/blocks/${encodeURIComponent(blockId)}/children`, { query: { page_size: pageSize } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const results = (res.data && res.data.results) || [];
    const blocks = results.map(r => ({ id: r.id, type: r.type, has_children: r.has_children, content: JSON.stringify(r[r.type] || {}), created_time: r.created_time, last_edited_time: r.last_edited_time }));
    return { ok: true, blocks };
  }
};
