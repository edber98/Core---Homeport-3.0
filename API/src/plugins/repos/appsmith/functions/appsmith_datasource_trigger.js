const { utils } = require("./utils");
module.exports = {
  async appsmith_datasource_trigger(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const datasourceId = String(d.datasourceId || "").trim();
    if (!datasourceId) return { ok: false, error: "Missing datasourceId." };
const options = {};
    const bodyJson = utils.safeJsonParse(d.bodyJson, 'bodyJson');
    if (bodyJson === undefined) return { ok: false, error: 'Missing bodyJson.' };
    options.json = bodyJson;
    const res = await utils.appsmithRequest(opts, `/api/v1/datasources/${encodeURIComponent(String(d.datasourceId || "").trim())}/trigger`, { method: 'POST', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, message: 'Opération terminée.', raw: res.data };
  }
};
