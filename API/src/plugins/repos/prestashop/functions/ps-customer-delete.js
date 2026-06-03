const { utils } = require("./utils");

module.exports = {
  async ps_customer_delete(node, msg, inputs, opts) {
    const id = String(inputs?.customerId || "").trim();
    if (!id) return { ok: false, error: "Missing customerId." };

    const res = await utils.psRequest(opts, `/customers/${id}`, { method: "DELETE", skipDisplay: true });
    if (!res.ok) return res;
    return { ok: true, id, message: "Client supprimé." };
  }
};
