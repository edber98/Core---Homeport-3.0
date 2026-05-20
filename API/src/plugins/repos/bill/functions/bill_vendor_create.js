const { utils } = require("./utils");

module.exports = {
  async bill_vendor_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Nom du fournisseur requis." };
    let address;
    try { address = utils.parseJson(d.addressJson, undefined, "Adresse"); } catch (e) { return { ok: false, error: e.message }; }
    const body = { name: d.name };
    if (d.email) body.email = d.email;
    if (d.phone) body.phone = d.phone;
    if (d.payeeName) body.payeeName = d.payeeName;
    if (address) body.address = address;
    const res = await utils.billRequest(opts, "POST", "/v3/vendors", { body });
    if (!res.ok) return res;
    const vendor = res.data || {};
    return { ok: true, id: utils.pickId(vendor), name: vendor.name || d.name, email: vendor.email || d.email || "", status: vendor.status || "" };
  }
};
