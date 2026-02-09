const { utils } = require("./utils");

module.exports = {
  async mc_report_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.campaignId) return { ok: false, error: "Missing campaignId." };

    const res = await utils.mailchimpRequest(opts, `/reports/${d.campaignId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id || "", campaignTitle: r.campaign_title || "", opens: String(r.opens?.opens_total || 0), clicks: String(r.clicks?.clicks_total || 0), sendTime: r.send_time || "" };
  }
};
