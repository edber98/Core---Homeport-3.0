const { utils } = require("./utils");

module.exports = {
  async facebook_upload_photo(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const pageId = (d.pageId || "").trim();
    if (!pageId) return { ok: false, error: "Missing pageId." };
    const url = (d.url || "").trim();
    if (!url) return { ok: false, error: "Missing photo URL." };
    const caption = (d.caption || "").trim();

    const body = { url };
    if (caption) body.caption = caption;

    log('Téléversement en cours...');
    const res = await utils.facebookRequest(opts, `/${encodeURIComponent(pageId)}/photos`, {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, postId: r.post_id, pageId };
  }
};
