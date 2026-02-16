const { utils } = require("./utils");

function toStr(value) {
  const str = String(value || "").trim();
  return str || null;
}

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_partner_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
        const data = inputs || {};
        const id = toInt(data.partnerId);
        if (!id) return { ok: false, error: "Champ partnerId requis." };
        const payload = {};
        if (data.name !== undefined && data.name !== "" && data.name !== null) payload["name"] = data.name;
        if (data.email !== undefined && data.email !== "" && data.email !== null) payload["email"] = data.email;
        if (data.phone !== undefined && data.phone !== "" && data.phone !== null) payload["phone"] = data.phone;
        if (data.street !== undefined && data.street !== "" && data.street !== null) payload["street"] = data.street;
        if (data.city !== undefined && data.city !== "" && data.city !== null) payload["city"] = data.city;

        const res = await utils.odooCall(opts, "res.partner", "write", [[id], payload]);
        if (!res.ok) return res;
        return { ok: true, partner: res.data };
  }
};
