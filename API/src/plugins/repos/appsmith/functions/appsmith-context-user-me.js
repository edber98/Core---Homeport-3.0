const { utils } = require("./utils");

module.exports = {
  async appsmith_user_me(node, msg, inputs, opts) {
    const res = await utils.appsmithRequest(opts, "/api/v1/users/me");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.normalizeUser(res.data || {}) };
  }
};
