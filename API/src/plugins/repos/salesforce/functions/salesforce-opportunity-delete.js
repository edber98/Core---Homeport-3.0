const { utils } = require("./utils");

module.exports = {
  async salesforce_opportunity_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const opportunityId = (d.opportunityId || "").toString().trim();
    if (!opportunityId) return { ok: false, error: "Missing opportunityId." };

    const res = await utils.sfRequest(opts, `/sobjects/Opportunity/${encodeURIComponent(opportunityId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Opportunity ${opportunityId} deleted.` };
  }
};
