const { utils } = require("./utils");

module.exports = {
  async salesforce_lead_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const leadId = (d.leadId || "").toString().trim();
    if (!leadId) return { ok: false, error: "Missing leadId." };

    const body = {};
    if (d.FirstName) body.FirstName = d.FirstName;
    if (d.LastName) body.LastName = d.LastName;
    if (d.Email) body.Email = d.Email;
    if (d.Phone) body.Phone = d.Phone;
    if (d.Status) body.Status = d.Status;

    if (Object.keys(body).length === 0) return { ok: false, error: "No fields to update." };

    log('Mise à jour en cours...');
    const res = await utils.sfRequest(opts, `/sobjects/Lead/${encodeURIComponent(leadId)}`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const getRes = await utils.sfRequest(opts, `/sobjects/Lead/${encodeURIComponent(leadId)}`);
    if (!getRes.ok) return { ok: true, id: leadId, status: "updated" };
    const r = getRes.data || {};
    return { ok: true, id: r.Id, FirstName: r.FirstName, LastName: r.LastName, Email: r.Email, Phone: r.Phone, Company: r.Company, Status: r.Status, CreatedDate: r.CreatedDate };
  }
};
