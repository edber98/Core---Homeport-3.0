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
  async odoo_employee_create(node, msg, inputs, opts) {
        const data = inputs || {};
        const payload = {};
        const _name = toStr(data.name);
        if (!_name) return { ok: false, error: "Champ name requis." };
        payload["name"] = _name;
        if (data.work_email !== undefined && data.work_email !== "" && data.work_email !== null) payload["work_email"] = data.work_email;
        if (data.job_title !== undefined && data.job_title !== "" && data.job_title !== null) payload["job_title"] = data.job_title;
        if (data.department_id !== undefined && data.department_id !== "" && data.department_id !== null) payload["department_id"] = data.department_id;
        if (data.work_phone !== undefined && data.work_phone !== "" && data.work_phone !== null) payload["work_phone"] = data.work_phone;

        const res = await utils.odooCall(opts, "hr.employee", "create", [payload]);
        if (!res.ok) return res;
        return { ok: true, employee: res.data };
  }
};
