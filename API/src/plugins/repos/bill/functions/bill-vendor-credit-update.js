const { utils } = require("./utils");

module.exports = {
  async bill_vendor_credit_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const vendorCreditId = String(d.vendorCreditId || "").trim();
    if (!vendorCreditId) return { ok: false, error: "ID vendor credit requis." };
    let body;
    if (typeof d.body === "object") body = d.body;
    else {
      try { body = JSON.parse(String(d.body || "{}")); } catch { return { ok: false, error: "JSON invalide dans body." }; }
    }

    const res = await utils.billRequest(opts, "PATCH", `/v3/vendor-credits/${encodeURIComponent(vendorCreditId)}`, { body });
    if (!res.ok) return res;
    return { ok: true, id: vendorCreditId, status: "updated", details: res.data || {} };
  }
};
