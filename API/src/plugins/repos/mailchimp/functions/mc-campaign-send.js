const { utils } = require("./utils");

module.exports = {
  async mc_campaign_send(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.campaignId) return { ok: false, error: "Missing campaignId." };

    log('Création en cours...');
    const res = await utils.mailchimpRequest(opts, `/campaigns/${d.campaignId}/actions/send`, { method: "POST" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "sent", message: "Campagne envoyée." };
  }
};
