const { utils } = require("./utils");

module.exports = {
  async clerk_user_get(node, msg, inputs, opts) {
    const userId = String((inputs || {}).userId || "").trim();
    if (!userId) return { ok: false, error: "ID utilisateur requis." };
    const res = await utils.clerkRequest(opts, `/users/${encodeURIComponent(userId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactUser(res.data || {}) };
  }
};
