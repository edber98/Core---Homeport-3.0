const { utils } = require("./utils");
module.exports = {
  async notion_page_restore(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const pageId = (d.pageId || "").trim();
    if (!pageId) return { ok: false, error: "ID de la page requis." };
    log('Restauration de la page...');
    const res = await utils.notionRequest(opts, `/pages/${encodeURIComponent(pageId)}`, {
      method: "PATCH",
      body: { archived: false }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    const titleProp = Object.values((r.properties || {})).find(p => p.type === "title");
    const title = titleProp?.title?.map(t => t.plain_text).join("") || "";
    return { ok: true, id: r.id, title, url: r.url, archived: r.archived, created_time: r.created_time, last_edited_time: r.last_edited_time };
  }
};
