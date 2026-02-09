const { utils } = require("./utils");

module.exports = {
  async dbx_get_account(node, msg, inputs, opts) {
    const res = await utils.dbxRequest(opts, "/users/get_current_account", null);
    if (!res.ok) return res;
    const a = res.data;
    return {
      ok: true, accountId: a.account_id || "",
      displayName: a.name?.display_name || "",
      email: a.email || "", emailVerified: a.email_verified ? "true" : "false",
      profilePhotoUrl: a.profile_photo_url || ""
    };
  }
};
