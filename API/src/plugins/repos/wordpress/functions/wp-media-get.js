const { utils } = require("./utils");

module.exports = {
  async wp_media_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const mediaId = (d.mediaId || "").toString().trim();
    if (!mediaId) return { ok: false, error: "Missing mediaId." };

    log('Récupération des données...');
    const res = await utils.wpRequest(opts, `/media/${encodeURIComponent(mediaId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id), title: r.title?.rendered || "", source_url: r.source_url || "", media_type: r.media_type || "", mime_type: r.mime_type || "", date: r.date, alt_text: r.alt_text || "" };
  }
};
