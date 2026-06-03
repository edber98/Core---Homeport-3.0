const { utils } = require("./utils");
module.exports = {
  async appsmith_plugin_default_icons(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};

const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/plugins/default/icons`, { method: 'GET', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
