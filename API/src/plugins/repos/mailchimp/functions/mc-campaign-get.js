const { utils } = require("./utils");

module.exports = {
  async mc_campaign_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.campaignId) return { ok: false, error: "Missing campaignId." };

    const res = await utils.mailchimpRequest(opts, `/campaigns/${d.campaignId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id || "", type: r.type || "", status: r.status || "", title: r.settings?.title || "", subject: r.settings?.subject_line || "", sendTime: r.send_time || "", createTime: r.create_time || "" };
  }
};
