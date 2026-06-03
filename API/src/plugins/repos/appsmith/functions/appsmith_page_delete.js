const { utils } = require("./utils");
module.exports = {
  async appsmith_page_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const branchedPageId = String(d.branchedPageId || "").trim();
    if (!branchedPageId) return { ok: false, error: "Missing branchedPageId." };
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/pages/${encodeURIComponent(String(d.branchedPageId || "").trim())}`, { method: 'DELETE', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, message: 'Opération terminée.', raw: res.data };
  }
};
