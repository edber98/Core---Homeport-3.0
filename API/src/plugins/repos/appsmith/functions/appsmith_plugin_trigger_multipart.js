const { utils } = require("./utils");
module.exports = {
  async appsmith_plugin_trigger_multipart(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const pluginId = String(d.pluginId || "").trim();
    if (!pluginId) return { ok: false, error: "Missing pluginId." };
const options = {};
    const formData = {};
    const file = d.file || d.file || d.content;
    if (!file) return { ok: false, error: 'Missing file.' };
    formData.file = file;
    options.formData = formData;
    const res = await utils.appsmithRequest(opts, `/api/v1/plugins/${encodeURIComponent(String(d.pluginId || "").trim())}/trigger`, { method: 'POST', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
