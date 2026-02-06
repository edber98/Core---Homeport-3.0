const { utils } = require("./utils");

module.exports = {
  async salesforce_case_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const caseId = (d.caseId || "").toString().trim();
    if (!caseId) return { ok: false, error: "Missing caseId." };

    const res = await utils.sfRequest(opts, `/sobjects/Case/${encodeURIComponent(caseId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.Id, Subject: r.Subject, Description: r.Description, Status: r.Status, Priority: r.Priority, ContactId: r.ContactId, CreatedDate: r.CreatedDate };
  }
};
