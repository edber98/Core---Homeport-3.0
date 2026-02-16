const { utils } = require("./utils");

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_invoice_lines_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = inputs || {};
    const limit = toInt(data.limit) || 100;
    const domain = [];
    if (toInt(data.move_id)) domain.push(["move_id", "=", toInt(data.move_id)]);
    if (toInt(data.product_id)) domain.push(["product_id", "=", toInt(data.product_id)]);
    if (toInt(data.account_id)) domain.push(["account_id", "=", toInt(data.account_id)]);

    const res = await utils.odooCall(opts, "account.move.line", "search_read", [], { domain, limit });
    if (!res.ok) return res;
    const countRes = await utils.odooCall(opts, "account.move.line", "search_count", [], { domain });
    if (!countRes.ok) return countRes;
    return { ok: true, lines: res.data, totalCount: countRes.data || 0 };
  }
};
