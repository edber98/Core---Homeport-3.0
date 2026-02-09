const { utils } = require("./utils");

module.exports = {
  async dolibarr_product_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.id) return { ok: false, error: "Champ id requis." };

    const res = await utils.dolibarrRequest(opts, `/products/${encodeURIComponent(d.id)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, message: "Supprimé avec succès." };
  }
};
