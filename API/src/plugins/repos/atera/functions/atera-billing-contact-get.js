const { utils } = require("./utils");

module.exports = {
  async atera_billing_contact_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.invoiceNumber) return { ok: false, error: "Missing invoiceNumber." };

    const res = await utils.ateraRequest(opts, `/billing/invoice/${encodeURIComponent(d.invoiceNumber)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
