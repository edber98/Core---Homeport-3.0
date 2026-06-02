const { utils } = require("./utils");

module.exports = {
  async appsmith_user_features(node, msg, inputs, opts) {
    const res = await utils.appsmithRequest(opts, "/api/v1/users/features");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return {
      ok: true,
      features: res.data,
      raw: res.data
    };
  }
};
