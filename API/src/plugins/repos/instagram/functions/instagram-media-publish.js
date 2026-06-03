const { utils } = require("./utils");

module.exports = {
  async instagram_media_publish(node, msg, inputs, opts) {
    const d = inputs || {};
    const igUserId = String(d.igUserId || "").trim();
    const creationId = String(d.creationId || "").trim();
    if (!igUserId) return { ok: false, error: "ID du compte Instagram requis." };
    if (!creationId) return { ok: false, error: "ID du container requis." };

    const res = await utils.instagramRequest(opts, `/${encodeURIComponent(igUserId)}/media_publish`, {
      method: "POST",
      body: { creation_id: creationId }
    });
    if (!res.ok) return res;
    return { ok: true, id: res.data?.id || "", status: "published", message: "Média publié." };
  }
};
