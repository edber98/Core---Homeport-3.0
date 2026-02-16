const { utils } = require("./utils");

module.exports = {
  async wp_page_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const pageId = (d.pageId || "").toString().trim();
    if (!pageId) return { ok: false, error: "Missing pageId." };

    log('Suppression en cours...');
    const res = await utils.wpRequest(opts, `/pages/${encodeURIComponent(pageId)}`, { method: "DELETE", query: { force: "true" } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Page ${pageId} supprimée.` };
  }
};
