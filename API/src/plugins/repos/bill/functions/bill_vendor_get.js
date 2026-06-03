const { utils } = require("./utils");

module.exports = {
  async bill_vendor_get(node, msg, inputs, opts) {
    const id = String((inputs && (inputs.vendorId || inputs.id)) || "").trim();
    if (!id) return { ok: false, error: "ID du fournisseur requis." };
    const res = await utils.billRequest(opts, "GET", `/v3/vendors/${encodeURIComponent(id)}`);
    if (!res.ok) return res;
    const vendor = res.data || {};
    return { ok: true, id: vendor.id || id, name: vendor.name || vendor.companyName || "", email: vendor.email || "", status: vendor.status || "", archived: String(!!vendor.archived) };
  }
};
