const { utils } = require("./utils");

module.exports = {
  async instagram_media_insights(node, msg, inputs, opts) {
    const d = inputs || {};
    const mediaId = String(d.mediaId || "").trim();
    if (!mediaId) return { ok: false, error: "ID du média requis." };
    const metric = String(d.metric || "impressions,reach,engagement,saved").trim();

    const res = await utils.instagramRequest(opts, `/${encodeURIComponent(mediaId)}/insights`, { query: { metric } });
    if (!res.ok) return res;
    const insights = utils.listData(res.data).map((item) => ({
      name: item.name || "",
      period: item.period || "",
      value: item.values && item.values[0] ? item.values[0].value : ""
    }));
    return { ok: true, insights, totalCount: String(insights.length) };
  }
};
