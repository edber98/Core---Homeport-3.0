const { utils } = require("./utils");
module.exports = {
  async notion_database_query(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const databaseId = (d.databaseId || "").trim();
    if (!databaseId) return { ok: false, error: "Missing databaseId." };
    const body = {};
    if (d.filter) { try { body.filter = typeof d.filter === "object" ? d.filter : JSON.parse(d.filter); } catch { return { ok: false, error: "Invalid JSON in filter." }; } }
    if (d.sorts) { try { body.sorts = typeof d.sorts === "object" ? d.sorts : JSON.parse(d.sorts); } catch { return { ok: false, error: "Invalid JSON in sorts." }; } }
    body.page_size = parseInt(d.pageSize, 10) || 100;
    log('Recherche en cours...');
    const res = await utils.notionRequest(opts, `/databases/${encodeURIComponent(databaseId)}/query`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const results = (res.data && res.data.results) || [];
    const pages = results.map(r => {
      const titleProp = Object.values((r.properties || {})).find(p => p.type === "title");
      const title = titleProp?.title?.map(t => t.plain_text).join("") || "";
      const parentType = r.parent ? Object.keys(r.parent).find(k => k !== "type") : "";
      const parentId = parentType ? r.parent[parentType] : "";
      return { id: r.id, title, url: r.url, parent_type: parentType, parent_id: parentId, archived: r.archived, created_time: r.created_time, last_edited_time: r.last_edited_time };
    });
    return { ok: true, pages };
  }
};
