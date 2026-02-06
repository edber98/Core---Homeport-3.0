const { utils } = require("./utils");

module.exports = {
  async ms_user_get_me(node, msg, inputs, opts) {
    const res = await utils.graphRequest(opts, "/me");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const u = res.data;
    return {
      ok: true,
      id: u.id,
      displayName: u.displayName || "",
      mail: u.mail || "",
      userPrincipalName: u.userPrincipalName || "",
      jobTitle: u.jobTitle || ""
    };
  }
};
