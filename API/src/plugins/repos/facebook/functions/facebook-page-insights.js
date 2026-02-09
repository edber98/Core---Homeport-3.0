const { utils } = require("./utils");

module.exports = {
  async facebook_page_insights(node, msg, inputs, opts) {
    const d = inputs || {};
    const pageId = (d.pageId || "").trim();
    if (!pageId) return { ok: false, error: "Missing pageId." };
    const metric = (d.metric || "page_impressions,page_engaged_users,page_fans").trim();
    const period = d.period || "day";

    const res = await utils.facebookRequest(opts, `/${encodeURIComponent(pageId)}/insights`, {
      query: { metric, period }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const insights = (r.data || []).map(i => ({
      name: i.name,
      title: i.title,
      period: i.period,
      values: i.values
    }));
    return { ok: true, insights };
  }
};
