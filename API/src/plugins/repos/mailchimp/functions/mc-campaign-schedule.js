const { utils } = require("./utils");

module.exports = {
  async mc_campaign_schedule(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.campaignId) return { ok: false, error: "Missing campaignId." };
    if (!d.scheduleTime) return { ok: false, error: "Missing scheduleTime." };

    log('Création en cours...');
    const res = await utils.mailchimpRequest(opts, `/campaigns/${d.campaignId}/actions/schedule`, { method: "POST", body: { schedule_time: d.scheduleTime } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "scheduled", message: "Campagne planifiée." };
  }
};
