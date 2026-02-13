const { utils } = require("./utils");
module.exports = {
  async notion_block_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const blockId = (d.blockId || "").trim();
    const contentStr = (d.content || "").trim();
    if (!blockId) return { ok: false, error: "Missing blockId." };
    if (!contentStr) return { ok: false, error: "Missing content." };
    let content;
    try { content = typeof contentStr === "object" ? contentStr : JSON.parse(contentStr); } catch { return { ok: false, error: "Invalid JSON in content." }; }
    log('Mise à jour en cours...');
    const res = await utils.notionRequest(opts, `/blocks/${encodeURIComponent(blockId)}`, { method: "PATCH", body: content });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, type: r.type, has_children: r.has_children, content: JSON.stringify(r[r.type] || {}), created_time: r.created_time, last_edited_time: r.last_edited_time };
  }
};
