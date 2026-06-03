const { utils } = require("./utils");
module.exports = {
  async appsmith_action_view(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.applicationId !== undefined && d.applicationId !== null && String(d.applicationId).trim() !== "") query.applicationId = String(d.applicationId).trim();
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/actions/view`, { method: 'GET', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = utils.toArray(res.data); return { ok: true, items, totalCount: items.length, raw: res.data };
  }
};
