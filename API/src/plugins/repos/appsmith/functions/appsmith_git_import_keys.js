const { utils } = require("./utils");
module.exports = {
  async appsmith_git_import_keys(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.keyType !== undefined && d.keyType !== null && String(d.keyType).trim() !== "") query.keyType = String(d.keyType).trim();
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/git/import/keys`, { method: 'GET', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
