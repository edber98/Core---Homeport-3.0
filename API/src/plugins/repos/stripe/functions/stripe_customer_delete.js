const { utils } = require("./utils");

module.exports = {
  async stripe_customer_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.customerId) return { ok: false, error: "Missing customerId." };
    const res = await utils.stripeRequest(opts, `/customers/${d.customerId}`, { method: "DELETE" });
    if (!res.ok) return res;
    return { ok: true, status: "deleted", message: `Customer ${d.customerId} deleted.` };
  }
};
