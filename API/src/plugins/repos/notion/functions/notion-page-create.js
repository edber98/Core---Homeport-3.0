const { utils } = require("./utils");
module.exports = {
  async notion_page_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const parentType = (d.parentType || "").trim();
    const parentId = (d.parentId || "").trim();
    const title = (d.title || "").trim();
    if (!parentType) return { ok: false, error: "Missing parentType." };
    if (!parentId) return { ok: false, error: "Missing parentId." };
    if (!title) return { ok: false, error: "Missing title." };
    const parent = parentType === "database_id" ? { database_id: parentId } : { page_id: parentId };
    const properties = { title: { title: [{ text: { content: title } }] } };
    const body = { parent, properties };
    if (d.content) { body.children = [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: d.content } }] } }]; }
    log('Création en cours...');
    const res = await utils.notionRequest(opts, "/pages", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    const titleProp = Object.values((r.properties || {})).find(p => p.type === "title");
    const pageTitle = titleProp?.title?.map(t => t.plain_text).join("") || "";
    return { ok: true, id: r.id, title: pageTitle, url: r.url, parent_type: parentType, parent_id: parentId, archived: r.archived, created_time: r.created_time, last_edited_time: r.last_edited_time };
  }
};
