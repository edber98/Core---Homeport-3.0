const { utils } = require("./utils");

module.exports = {
  async hubspot_deal_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const dealId = (d.dealId || "").toString().trim();
    if (!dealId) return { ok: false, error: "Missing dealId." };

    log('Suppression en cours...');
    const res = await utils.hubspotRequest(opts, `/crm/v3/objects/deals/${encodeURIComponent(dealId)}`, {
      method: "DELETE"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Deal ${dealId} deleted.` };
  }
};
