const { utils } = require("./utils");
module.exports = {
  async wp_tag_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const tagId = String(d.tagId || "").trim();
    if (!tagId) return { ok: false, error: "Missing tagId." };
    const res = await utils.wpRequest(opts, `/tags/${encodeURIComponent(tagId)}`, { method: "DELETE", query: { force: "true" } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: `Tag ${tagId} supprimé.` };
  }
};
