const { utils } = require("./utils");
module.exports = {
  async wp_category_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const categoryId = String(d.categoryId || "").trim();
    if (!categoryId) return { ok: false, error: "Missing categoryId." };
    const res = await utils.wpRequest(opts, `/categories/${encodeURIComponent(categoryId)}`, { method: "DELETE", query: { force: "true" } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: `Catégorie ${categoryId} supprimée.` };
  }
};
