const { utils } = require("./utils");
module.exports = {
  async notion_page_archive(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const pageId = (d.pageId || "").trim();
    if (!pageId) return { ok: false, error: "Missing pageId." };
    log('Suppression en cours...');
    const res = await utils.notionRequest(opts, `/pages/${encodeURIComponent(pageId)}`, { method: "PATCH", body: { archived: true } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "archived", message: `Page ${pageId} archived.` };
  }
};
