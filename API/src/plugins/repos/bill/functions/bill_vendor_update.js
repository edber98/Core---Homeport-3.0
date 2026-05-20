const { utils } = require("./utils");

module.exports = {
  async bill_vendor_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const id = String(d.vendorId || d.id || "").trim();
    if (!id) return { ok: false, error: "ID du fournisseur requis." };
    let address;
    try { address = utils.parseJson(d.addressJson, undefined, "Adresse"); } catch (e) { return { ok: false, error: e.message }; }
    const body = {};
    for (const key of ["name", "email", "phone", "payeeName"]) if (d[key]) body[key] = d[key];
    if (address) body.address = address;
    const res = await utils.billRequest(opts, "PATCH", `/v3/vendors/${encodeURIComponent(id)}`, { body });
    if (!res.ok) return res;
    const vendor = res.data || {};
    return { ok: true, id: vendor.id || id, name: vendor.name || d.name || "", email: vendor.email || d.email || "", status: vendor.status || "" };
  }
};
