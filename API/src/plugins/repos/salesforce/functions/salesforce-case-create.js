const { utils } = require("./utils");

module.exports = {
  async salesforce_case_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const Subject = (d.Subject || "").trim();
    if (!Subject) return { ok: false, error: "Missing Subject." };

    const body = { Subject };
    if (d.Description) body.Description = d.Description;
    if (d.Status) body.Status = d.Status;
    if (d.Priority) body.Priority = d.Priority;
    if (d.ContactId) body.ContactId = d.ContactId;

    const res = await utils.sfRequest(opts, "/sobjects/Case", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const getRes = await utils.sfRequest(opts, `/sobjects/Case/${res.data.id}`);
    if (!getRes.ok) return { ok: true, id: res.data.id };
    const r = getRes.data || {};
    return { ok: true, id: r.Id, Subject: r.Subject, Description: r.Description, Status: r.Status, Priority: r.Priority, ContactId: r.ContactId, CreatedDate: r.CreatedDate };
  }
};
