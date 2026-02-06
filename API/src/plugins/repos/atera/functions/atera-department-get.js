const { utils } = require("./utils");

module.exports = {
  async atera_department_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.departmentId) return { ok: false, error: "Missing departmentId." };

    const res = await utils.ateraRequest(opts, `/departments/${encodeURIComponent(d.departmentId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
