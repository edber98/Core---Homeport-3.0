const { utils } = require("./utils");

module.exports = {
  async wc_category_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.categoryId) return { ok: false, error: "Missing categoryId." };
    const res = await utils.wcRequest(opts, `/products/categories/${d.categoryId}`, { method: "DELETE", query: { force: "true" } });
    if (!res.ok) return res;
    return { ok: true, status: "deleted", message: `Catégorie ${d.categoryId} supprimée.` };
  }
};
