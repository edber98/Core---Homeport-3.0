const { utils } = require("./utils");

module.exports = {
  async atera_custom_value_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.rowId) return { ok: false, error: "Missing rowId." };

    const res = await utils.ateraRequest(opts, `/customvalues/${encodeURIComponent(d.rowId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const data = Array.isArray(res.data) ? res.data[0] : res.data;
    return { ok: true, ...data };
  }
};
