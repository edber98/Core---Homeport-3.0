const { utils } = require("./utils");

module.exports = {
  async brevo_campaign_send_test(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const campaignId = parseInt(d.campaignId, 10);
    if (isNaN(campaignId)) return { ok: false, error: "Missing campaignId." };
    if (!d.emailTo) return { ok: false, error: "Missing emailTo." };

    const emailTo = d.emailTo.split(/[,\n]/).map(e => e.trim()).filter(Boolean);
    log('Création en cours...');
    const res = await utils.brevoRequest(opts, `/emailCampaigns/${campaignId}/sendTest`, { method: "POST", body: { emailTo } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "sent", message: "Test envoyé." };
  }
};
