const { utils } = require("./utils");
module.exports = {
  async appsmith_datasource_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const id = String(d.id || "").trim();
    if (!id) return { ok: false, error: "Missing id." };
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/datasources/${encodeURIComponent(String(d.id || "").trim())}`, { method: 'DELETE', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, message: 'Opération terminée.', raw: res.data };
  }
};
