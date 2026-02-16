const { utils } = require("./utils");

module.exports = {
  async salesforce_case_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const caseId = (d.caseId || "").toString().trim();
    if (!caseId) return { ok: false, error: "Missing caseId." };

    const body = {};
    if (d.Subject) body.Subject = d.Subject;
    if (d.Status) body.Status = d.Status;
    if (d.Priority) body.Priority = d.Priority;

    if (Object.keys(body).length === 0) return { ok: false, error: "No fields to update." };

    log('Mise à jour en cours...');
    const res = await utils.sfRequest(opts, `/sobjects/Case/${encodeURIComponent(caseId)}`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const getRes = await utils.sfRequest(opts, `/sobjects/Case/${encodeURIComponent(caseId)}`);
    if (!getRes.ok) return { ok: true, id: caseId, status: "updated" };
    const r = getRes.data || {};
    return { ok: true, id: r.Id, Subject: r.Subject, Description: r.Description, Status: r.Status, Priority: r.Priority, ContactId: r.ContactId, CreatedDate: r.CreatedDate };
  }
};
