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
  async odoo_partner_create(node, msg, inputs, opts) {
        const data = inputs || {};
        const payload = {};
        const _name = toStr(data.name);
        if (!_name) return { ok: false, error: "Champ name requis." };
        payload["name"] = _name;
        if (data.email !== undefined && data.email !== "" && data.email !== null) payload["email"] = data.email;
        if (data.phone !== undefined && data.phone !== "" && data.phone !== null) payload["phone"] = data.phone;
        if (data.street !== undefined && data.street !== "" && data.street !== null) payload["street"] = data.street;
        if (data.city !== undefined && data.city !== "" && data.city !== null) payload["city"] = data.city;
        if (data.country_id !== undefined && data.country_id !== "" && data.country_id !== null) payload["country_id"] = data.country_id;
        if (data.is_company !== undefined && data.is_company !== "" && data.is_company !== null) payload["is_company"] = data.is_company;

        const res = await utils.odooCall(opts, "res.partner", "create", [payload]);
        if (!res.ok) return res;
        return { ok: true, partner: res.data };
  }
};
