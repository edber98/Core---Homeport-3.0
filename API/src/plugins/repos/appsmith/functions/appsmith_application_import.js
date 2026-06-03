const { utils } = require("./utils");
module.exports = {
  async appsmith_application_import(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const workspaceId = String(d.workspaceId || "").trim();
    if (!workspaceId) return { ok: false, error: "Missing workspaceId." };
const options = {};
    const formData = {};
    const file = d.file || d.file || d.content;
    if (!file) return { ok: false, error: 'Missing file.' };
    formData.file = file;
    options.formData = formData;
    const res = await utils.appsmithRequest(opts, `/api/v1/applications/import/${encodeURIComponent(String(d.workspaceId || "").trim())}`, { method: 'POST', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
