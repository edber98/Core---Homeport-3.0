const { utils } = require("./utils");
module.exports = {
  async notion_page_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const pageId = (d.pageId || "").trim();
    if (!pageId) return { ok: false, error: "Missing pageId." };
    const res = await utils.notionRequest(opts, `/pages/${encodeURIComponent(pageId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    const titleProp = Object.values((r.properties || {})).find(p => p.type === "title");
    const title = titleProp?.title?.map(t => t.plain_text).join("") || "";
    const parentType = r.parent ? Object.keys(r.parent).find(k => k !== "type") : "";
    const parentId = parentType ? r.parent[parentType] : "";
    return { ok: true, id: r.id, title, url: r.url, parent_type: parentType, parent_id: parentId, archived: r.archived, created_time: r.created_time, last_edited_time: r.last_edited_time };
  }
};
