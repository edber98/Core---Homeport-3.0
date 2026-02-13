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
  async odoo_invoices_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
        const data = inputs || {};
        const limit = toInt(data.limit) || 50;
        const domain = [];
        if (data.state) domain.push(["state", "=", data.state]);
        if (data.move_type) domain.push(["move_type", "=", data.move_type]);
        if (toInt(data.partner_id)) domain.push(["partner_id", "=", toInt(data.partner_id)]);

        const res = await utils.odooCall(opts, "account.move", "search_read", [], {
          domain, limit
        });
        if (!res.ok) return res;
        const countRes = await utils.odooCall(opts, "account.move", "search_count", [], { domain });
        if (!countRes.ok) return countRes;
        return { ok: true, invoices: res.data, totalCount: countRes.data || 0 };
  }
};
