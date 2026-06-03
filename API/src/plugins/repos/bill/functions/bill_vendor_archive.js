const { utils } = require("./utils");

module.exports = {
  async bill_vendor_archive(node, msg, inputs, opts) {
    const id = String((inputs && (inputs.vendorId || inputs.id)) || "").trim();
    if (!id) return { ok: false, error: "ID du fournisseur requis." };
    const res = await utils.billRequest(opts, "POST", `/v3/vendors/${encodeURIComponent(id)}/archive`);
    if (!res.ok) return res;
    return { ok: true, id, status: "archived" };
  }
};
