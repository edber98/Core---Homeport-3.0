const { utils } = require("./utils");
module.exports = {
  async appsmith_plugin_form(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const pluginId = String(d.pluginId || "").trim();
    if (!pluginId) return { ok: false, error: "Missing pluginId." };
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/plugins/${encodeURIComponent(String(d.pluginId || "").trim())}/form`, { method: 'GET', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
