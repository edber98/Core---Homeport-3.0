const { utils } = require("./utils");
module.exports = {
  async zd_user_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const userId = parseInt(d.userId, 10);
    if (isNaN(userId)) return { ok: false, error: "Missing userId." };
    const res = await utils.zendeskRequest(opts, `/users/${userId}.json`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: "Utilisateur supprimé." };
  }
};
