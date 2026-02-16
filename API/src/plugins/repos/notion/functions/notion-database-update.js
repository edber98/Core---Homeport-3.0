const { utils } = require("./utils");
module.exports = {
  async notion_database_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const databaseId = (d.databaseId || "").trim();
    if (!databaseId) return { ok: false, error: "Missing databaseId." };
    const body = {};
    if (d.title) body.title = [{ text: { content: d.title } }];
    if (d.properties) { try { body.properties = typeof d.properties === "object" ? d.properties : JSON.parse(d.properties); } catch { return { ok: false, error: "Invalid JSON in properties." }; } }
    log('Mise à jour en cours...');
    const res = await utils.notionRequest(opts, `/databases/${encodeURIComponent(databaseId)}`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    const title = r.title?.map(t => t.plain_text).join("") || "";
    return { ok: true, id: r.id, title, url: r.url, description: r.description?.map(t => t.plain_text).join("") || "", created_time: r.created_time, last_edited_time: r.last_edited_time };
  }
};
