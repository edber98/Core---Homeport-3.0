const { utils } = require("./utils");

module.exports = {
  async brevo_campaign_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const campaignId = parseInt(d.campaignId, 10);
    if (isNaN(campaignId)) return { ok: false, error: "Missing campaignId." };

    const res = await utils.brevoRequest(opts, `/emailCampaigns/${campaignId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", subject: r.subject || "", status: r.status || "", type: r.type || "", createdAt: r.createdAt || "", scheduledAt: r.scheduledAt || "" };
  }
};
