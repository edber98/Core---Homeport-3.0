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
  async odoo_employee_update(node, msg, inputs, opts) {
        const data = inputs || {};
        const id = toInt(data.employeeId);
        if (!id) return { ok: false, error: "Champ employeeId requis." };
        const payload = {};
        if (data.name !== undefined && data.name !== "" && data.name !== null) payload["name"] = data.name;
        if (data.job_title !== undefined && data.job_title !== "" && data.job_title !== null) payload["job_title"] = data.job_title;
        if (data.department_id !== undefined && data.department_id !== "" && data.department_id !== null) payload["department_id"] = data.department_id;

        const res = await utils.odooCall(opts, "hr.employee", "write", [[id], payload]);
        if (!res.ok) return res;
        return { ok: true, employee: res.data };
  }
};
