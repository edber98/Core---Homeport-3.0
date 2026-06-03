const { utils } = require("./utils");
module.exports = {
  async appsmith_workspace_home_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};

const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/workspaces/home`, { method: 'GET', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = utils.toArray(res.data); return { ok: true, items, totalCount: items.length, raw: res.data };
  }
};
