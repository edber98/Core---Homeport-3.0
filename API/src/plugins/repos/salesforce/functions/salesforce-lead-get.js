const { utils } = require("./utils");

module.exports = {
  async salesforce_lead_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const leadId = (d.leadId || "").toString().trim();
    if (!leadId) return { ok: false, error: "Missing leadId." };

    const res = await utils.sfRequest(opts, `/sobjects/Lead/${encodeURIComponent(leadId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.Id, FirstName: r.FirstName, LastName: r.LastName, Email: r.Email, Phone: r.Phone, Company: r.Company, Status: r.Status, CreatedDate: r.CreatedDate };
  }
};
