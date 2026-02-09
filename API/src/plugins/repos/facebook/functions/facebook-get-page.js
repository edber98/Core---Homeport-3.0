const { utils } = require("./utils");

module.exports = {
  async facebook_get_page(node, msg, inputs, opts) {
    const d = inputs || {};
    const pageId = (d.pageId || "").trim();
    if (!pageId) return { ok: false, error: "Missing pageId." };

    const res = await utils.facebookRequest(opts, `/${encodeURIComponent(pageId)}`, {
      query: { fields: "id,name,category,fan_count,link,picture,about,website" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id,
      name: r.name,
      category: r.category,
      fanCount: r.fan_count,
      link: r.link,
      picture: r.picture?.data?.url,
      about: r.about,
      website: r.website
    };
  }
};
