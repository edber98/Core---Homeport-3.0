const { utils } = require("./utils");

module.exports = {
  async facebook_list_feed(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const pageId = (d.pageId || "").trim();
    if (!pageId) return { ok: false, error: "Missing pageId." };
    const limit = parseInt(d.limit, 10) || 10;

    log('Récupération de la liste...');
    const res = await utils.facebookRequest(opts, `/${encodeURIComponent(pageId)}/feed`, {
      query: { fields: "id,message,created_time,from,type", limit }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const posts = (r.data || []).map(p => ({
      id: p.id,
      message: p.message,
      createdTime: p.created_time,
      from: p.from?.name,
      type: p.type
    }));
    return { ok: true, posts , totalCount: posts.length };
  }
};
