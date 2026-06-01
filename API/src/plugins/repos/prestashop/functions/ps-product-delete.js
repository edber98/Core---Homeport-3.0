const { utils } = require("./utils");

module.exports = {
  async ps_product_delete(node, msg, inputs, opts) {
    const id = String(inputs?.productId || "").trim();
    if (!id) return { ok: false, error: "Missing productId." };

    const res = await utils.psRequest(opts, `/products/${id}`, { method: "DELETE", skipDisplay: true });
    if (!res.ok) return res;
    return { ok: true, id, message: "Produit supprimé." };
  }
};
