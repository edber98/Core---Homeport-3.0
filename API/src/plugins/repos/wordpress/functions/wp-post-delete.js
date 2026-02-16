const { utils } = require("./utils");

module.exports = {
  async wp_post_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const postId = (d.postId || "").toString().trim();
    if (!postId) return { ok: false, error: "Missing postId." };

    log('Suppression en cours...');
    const res = await utils.wpRequest(opts, `/posts/${encodeURIComponent(postId)}`, { method: "DELETE", query: { force: "true" } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Article ${postId} supprimé.` };
  }
};
