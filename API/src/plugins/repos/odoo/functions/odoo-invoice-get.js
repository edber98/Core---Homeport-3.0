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
  async odoo_invoice_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = inputs || {};
    const id = toInt(data.invoiceId);
    if (!id) return { ok: false, error: "Champ invoiceId requis." };

    const res = await utils.odooCall(opts, "account.move", "read", [[id]], {});
    if (!res.ok) return res;
    const record = Array.isArray(res.data) ? res.data[0] || null : res.data;
    return { ok: true, invoice: record };
  }
};
