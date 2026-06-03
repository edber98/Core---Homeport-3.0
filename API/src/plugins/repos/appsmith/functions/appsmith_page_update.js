const { utils } = require("./utils");
module.exports = {
  async appsmith_page_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const branchedPageId = String(d.branchedPageId || "").trim();
    if (!branchedPageId) return { ok: false, error: "Missing branchedPageId." };
const options = {};
    const bodyJson = utils.safeJsonParse(d.bodyJson, 'bodyJson');
    if (bodyJson === undefined) return { ok: false, error: 'Missing bodyJson.' };
    options.json = bodyJson;
    const res = await utils.appsmithRequest(opts, `/api/v1/pages/${encodeURIComponent(String(d.branchedPageId || "").trim())}`, { method: 'PUT', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
