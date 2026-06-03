const { utils } = require("./utils");

module.exports = {
  async bill_payments_bulk_create(node, msg, inputs, opts) {
    const d = inputs || {};
    let body;
    if (typeof d.body === "object") body = d.body;
    else {
      try { body = JSON.parse(String(d.body || "{}")); } catch { return { ok: false, error: "JSON invalide dans body." }; }
    }

    const res = await utils.billRequest(opts, "POST", "/v3/payments/bulk", { body });
    if (!res.ok) return res;
    return { ok: true, id: res.data?.id || "", status: "created", details: res.data || {} };
  }
};
