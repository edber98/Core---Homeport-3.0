const { utils } = require("./utils");
module.exports = {
  async notion_database_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const parentPageId = (d.parentPageId || "").trim();
    const title = (d.title || "").trim();
    const propertiesStr = (d.properties || "").trim();
    if (!parentPageId) return { ok: false, error: "Missing parentPageId." };
    if (!title) return { ok: false, error: "Missing title." };
    if (!propertiesStr) return { ok: false, error: "Missing properties." };
    let properties;
    try { properties = typeof propertiesStr === "object" ? propertiesStr : JSON.parse(propertiesStr); } catch { return { ok: false, error: "Invalid JSON in properties." }; }
    const body = { parent: { page_id: parentPageId }, title: [{ text: { content: title } }], properties };
    log('Création en cours...');
    const res = await utils.notionRequest(opts, "/databases", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    const dbTitle = r.title?.map(t => t.plain_text).join("") || "";
    return { ok: true, id: r.id, title: dbTitle, url: r.url, description: r.description?.map(t => t.plain_text).join("") || "", created_time: r.created_time, last_edited_time: r.last_edited_time };
  }
};
