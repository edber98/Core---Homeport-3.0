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
  async odoo_account_list(node, msg, inputs, opts) {
        const data = inputs || {};
        const limit = toInt(data.limit) || 50;
        const domain = [];
        if (data.account_type) domain.push(["account_type", "=", data.account_type]);

        const res = await utils.odooCall(opts, "account.account", "search_read", [], {
          domain, fields: ["id", "name", "code", "account_type"], limit
        });
        if (!res.ok) return res;
        return { ok: true, accounts: res.data };
  }
};
