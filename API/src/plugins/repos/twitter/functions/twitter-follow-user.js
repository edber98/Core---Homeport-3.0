const { utils } = require("./utils");

module.exports = {
  async twitter_follow_user(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const userId = (d.userId || "").trim();
    if (!userId) return { ok: false, error: "Missing userId (your user ID)." };
    const targetUserId = (d.targetUserId || "").trim();
    if (!targetUserId) return { ok: false, error: "Missing targetUserId." };

    log('Appel API en cours...');
    const res = await utils.twitterRequest(opts, `/users/${encodeURIComponent(userId)}/following`, {
      method: "POST",
      body: { target_user_id: targetUserId }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data?.data || {};
    return { ok: true, following: r.following, pendingFollow: r.pending_follow };
  }
};
