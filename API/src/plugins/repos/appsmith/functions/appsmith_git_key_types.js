const { utils } = require("./utils");
module.exports = {
  async appsmith_git_key_types(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};

const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/git/protocol/key-types`, { method: 'GET', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = utils.toArray(res.data); return { ok: true, items, totalCount: items.length, raw: res.data };
  }
};
