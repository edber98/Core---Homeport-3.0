const { utils } = require("./utils");

module.exports = {
  async mc_campaign_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.campaignId) return { ok: false, error: "Missing campaignId." };

    const body = {};
    if (d.settings) body.settings = typeof d.settings === "object" ? d.settings : JSON.parse(String(d.settings));
    if (d.recipients) body.recipients = typeof d.recipients === "object" ? d.recipients : JSON.parse(String(d.recipients));

    const res = await utils.mailchimpRequest(opts, `/campaigns/${d.campaignId}`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id || "", type: r.type || "", status: r.status || "", title: r.settings?.title || "", subject: r.settings?.subject_line || "" };
  }
};
