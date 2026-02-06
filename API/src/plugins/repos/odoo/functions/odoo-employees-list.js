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
  async odoo_employees_list(node, msg, inputs, opts) {
        const data = inputs || {};
        const limit = toInt(data.limit) || 50;
        const domain = [];
        if (toInt(data.department_id)) domain.push(["department_id", "=", toInt(data.department_id)]);

        const res = await utils.odooCall(opts, "hr.employee", "search_read", [], {
          domain, fields: ["id", "name", "work_email", "job_title", "department_id", "work_phone"], limit
        });
        if (!res.ok) return res;
        return { ok: true, employees: res.data };
  }
};
