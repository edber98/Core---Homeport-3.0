const { utils } = require("./utils");

module.exports = {
  async instagram_media_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const igUserId = String(d.igUserId || "").trim();
    if (!igUserId) return { ok: false, error: "ID du compte Instagram requis." };

    const res = await utils.instagramRequest(opts, `/${encodeURIComponent(igUserId)}/media`, {
      query: {
        fields: "id,caption,media_type,media_url,permalink,timestamp,username,comments_count,like_count",
        limit: parseInt(d.limit, 10) || 25,
        after: d.after
      }
    });
    if (!res.ok) return res;
    const media = utils.listData(res.data).map(utils.mapMedia);
    return { ok: true, media, totalCount: String(media.length), nextCursor: res.data?.paging?.cursors?.after || "" };
  }
};
