const { utils } = require("./utils");

module.exports = {
  async appsmith_git_profile_default(node, msg, inputs, opts) {
    const res = await utils.appsmithRequest(opts, "/api/v1/git/profile/default");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.normalizeGitProfile(res.data || {}) };
  }
};
