const { utils } = require("./utils");

module.exports = {
  async salesforce_lead_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const leadId = (d.leadId || "").toString().trim();
    if (!leadId) return { ok: false, error: "Missing leadId." };

    log('Suppression en cours...');
    const res = await utils.sfRequest(opts, `/sobjects/Lead/${encodeURIComponent(leadId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Lead ${leadId} deleted.` };
  }
};
