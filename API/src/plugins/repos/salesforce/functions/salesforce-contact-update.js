const { utils } = require("./utils");

module.exports = {
  async salesforce_contact_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const contactId = (d.contactId || "").toString().trim();
    if (!contactId) return { ok: false, error: "Missing contactId." };

    const body = {};
    if (d.FirstName) body.FirstName = d.FirstName;
    if (d.LastName) body.LastName = d.LastName;
    if (d.Email) body.Email = d.Email;
    if (d.Phone) body.Phone = d.Phone;

    if (Object.keys(body).length === 0) return { ok: false, error: "No fields to update." };

    log('Mise à jour en cours...');
    const res = await utils.sfRequest(opts, `/sobjects/Contact/${encodeURIComponent(contactId)}`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const getRes = await utils.sfRequest(opts, `/sobjects/Contact/${encodeURIComponent(contactId)}`);
    if (!getRes.ok) return { ok: true, id: contactId, status: "updated" };
    const r = getRes.data || {};
    return { ok: true, id: r.Id, FirstName: r.FirstName, LastName: r.LastName, Email: r.Email, Phone: r.Phone, AccountId: r.AccountId, CreatedDate: r.CreatedDate };
  }
};
