const { utils } = require("./utils");

module.exports = {
  async bill_vendor_credit_create(node, msg, inputs, opts) {
    const d = inputs || {};
    let body;
    if (typeof d.body === "object") body = d.body;
    else {
      try { body = JSON.parse(String(d.body || "{}")); } catch { return { ok: false, error: "JSON invalide dans body." }; }
    }
    const res = await utils.billRequest(opts, "POST", "/v3/vendor-credits", { body });
    if (!res.ok) return res;
    const r = res.data || {};
    return { ok: true, id: r.id || "", status: "created", details: r };
  }
};
