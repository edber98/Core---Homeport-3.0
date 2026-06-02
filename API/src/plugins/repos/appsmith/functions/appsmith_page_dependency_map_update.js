const { utils } = require("./utils");
module.exports = {
  async appsmith_page_dependency_map_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const defaultPageId = String(d.defaultPageId || "").trim();
    if (!defaultPageId) return { ok: false, error: "Missing defaultPageId." };
const options = {};
    const bodyJson = utils.safeJsonParse(d.bodyJson, 'bodyJson');
    if (bodyJson === undefined) return { ok: false, error: 'Missing bodyJson.' };
    options.json = bodyJson;
    const res = await utils.appsmithRequest(opts, `/api/v1/pages/${encodeURIComponent(String(d.defaultPageId || "").trim())}/dependencyMap`, { method: 'PUT', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, message: 'Opération terminée.', raw: res.data };
  }
};
