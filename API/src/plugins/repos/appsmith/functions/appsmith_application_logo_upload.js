const { utils } = require("./utils");
module.exports = {
  async appsmith_application_logo_upload(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const branchedApplicationId = String(d.branchedApplicationId || "").trim();
    if (!branchedApplicationId) return { ok: false, error: "Missing branchedApplicationId." };
const options = {};
    const formData = {};
    const file = d.file || d.file || d.content;
    if (!file) return { ok: false, error: 'Missing file.' };
    formData.file = file;
    options.formData = formData;
    const res = await utils.appsmithRequest(opts, `/api/v1/applications/${encodeURIComponent(String(d.branchedApplicationId || "").trim())}/logo`, { method: 'POST', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
