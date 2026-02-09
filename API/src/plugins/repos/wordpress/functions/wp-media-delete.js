const { utils } = require("./utils");

module.exports = {
  async wp_media_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const mediaId = (d.mediaId || "").toString().trim();
    if (!mediaId) return { ok: false, error: "Missing mediaId." };

    const res = await utils.wpRequest(opts, `/media/${encodeURIComponent(mediaId)}`, { method: "DELETE", query: { force: "true" } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Média ${mediaId} supprimé.` };
  }
};
