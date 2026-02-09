const { utils } = require("./utils");

module.exports = {
  async facebook_list_audiences(node, msg, inputs, opts) {
    const d = inputs || {};
    const adAccountId = (d.adAccountId || "").trim();
    if (!adAccountId) return { ok: false, error: "Missing adAccountId." };
    const limit = parseInt(d.limit, 10) || 25;

    const res = await utils.facebookRequest(opts, `/act_${encodeURIComponent(adAccountId)}/customaudiences`, {
      query: { fields: "id,name,subtype,approximate_count,delivery_status", limit }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const audiences = (r.data || []).map(a => ({
      id: a.id,
      name: a.name,
      subtype: a.subtype,
      approximateCount: a.approximate_count
    }));
    return { ok: true, audiences };
  }
};
