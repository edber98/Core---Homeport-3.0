const { utils } = require("./utils");

module.exports = {
  async clerk_user_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const userId = String((inputs || {}).userId || "").trim();
    if (!userId) return { ok: false, error: "ID utilisateur requis." };
    log("Suppression de l'utilisateur Clerk...");
    const res = await utils.clerkRequest(opts, `/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: userId, success: true };
  }
};
