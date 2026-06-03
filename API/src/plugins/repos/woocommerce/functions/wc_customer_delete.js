const { utils } = require("./utils");

module.exports = {
  async wc_customer_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.customerId) return { ok: false, error: "Missing customerId." };
    const res = await utils.wcRequest(opts, `/customers/${d.customerId}`, { method: "DELETE", query: { force: "true" } });
    if (!res.ok) return res;
    return { ok: true, status: "deleted", message: `Client ${d.customerId} supprimé.` };
  }
};
