const { utils } = require("./utils");
module.exports = {
  async appsmith_action_move(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};

const options = {};
    const bodyJson = utils.safeJsonParse(d.bodyJson, 'bodyJson');
    if (bodyJson === undefined) return { ok: false, error: 'Missing bodyJson.' };
    options.json = bodyJson;
    const res = await utils.appsmithRequest(opts, `/api/v1/actions/move`, { method: 'PUT', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
