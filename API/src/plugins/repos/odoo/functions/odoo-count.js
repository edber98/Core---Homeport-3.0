const { utils } = require("./utils");

function toStr(value) {
  const str = String(value || "").trim();
  return str || null;
}

module.exports = {
  async odoo_count(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = inputs || {};
    const model = toStr(data.model);
    if (!model) return { ok: false, error: "Champ model requis." };

    let domain = [];
    if (data.domain) {
      try { domain = JSON.parse(data.domain); } catch (e) { return { ok: false, error: "Domain JSON invalide : " + e.message }; }
    }

    const res = await utils.odooCall(opts, model, "search_count", [], { domain });
    if (!res.ok) return res;
    return { ok: true, count: res.data || 0, model };
  }
};
