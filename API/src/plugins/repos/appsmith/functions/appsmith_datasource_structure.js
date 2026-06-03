const { utils } = require("./utils");
module.exports = {
  async appsmith_datasource_structure(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const datasourceId = String(d.datasourceId || "").trim();
    if (!datasourceId) return { ok: false, error: "Missing datasourceId." };
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/datasources/${encodeURIComponent(String(d.datasourceId || "").trim())}/structure`, { method: 'GET', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
