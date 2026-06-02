const { utils } = require("./utils");
module.exports = {
  async appsmith_page_static_url_verify(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const branchedPageId = String(d.branchedPageId || "").trim();
    if (!branchedPageId) return { ok: false, error: "Missing branchedPageId." };
    const requestedSlug = String(d.requestedSlug || "").trim();
    if (!requestedSlug) return { ok: false, error: "Missing requestedSlug." };
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/pages/${encodeURIComponent(String(d.branchedPageId || "").trim())}/static-url/verify/${encodeURIComponent(String(d.requestedSlug || "").trim())}`, { method: 'GET', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
