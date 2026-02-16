const { utils } = require("./utils");

module.exports = {
  async facebook_list_photos(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const pageId = (d.pageId || "").trim();
    if (!pageId) return { ok: false, error: "Missing pageId." };
    const limit = parseInt(d.limit, 10) || 25;

    log('Récupération de la liste...');
    const res = await utils.facebookRequest(opts, `/${encodeURIComponent(pageId)}/photos`, {
      query: { fields: "id,name,picture,source,created_time", limit, type: "uploaded" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const photos = (r.data || []).map(p => ({
      id: p.id,
      name: p.name,
      picture: p.picture,
      source: p.source,
      createdTime: p.created_time
    }));
    return { ok: true, photos , totalCount: photos.length };
  }
};
