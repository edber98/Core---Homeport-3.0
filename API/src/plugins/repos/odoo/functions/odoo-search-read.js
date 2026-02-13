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
  async odoo_search_read(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = inputs || {};
    const model = toStr(data.model);
    if (!model) return { ok: false, error: "Champ model requis." };

    let domain = [];
    if (data.domain) {
      try { domain = JSON.parse(data.domain); } catch (e) { return { ok: false, error: "Domain JSON invalide: " + e.message }; }
    }

    let fields = [];
    if (data.fields) {
      fields = String(data.fields).split(",").map(s => s.trim()).filter(Boolean);
    }

    const limit = toInt(data.limit) || 50;
    const offset = toInt(data.offset) || 0;

    const res = await utils.odooCall(opts, model, "search_read", [], { domain, fields, limit, offset });
    if (!res.ok) return res;
    return { ok: true, data: JSON.stringify(res.data) };
  }
};
