const { utils } = require("./utils");

module.exports = {
  async salesforce_contact_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const contactId = (d.contactId || "").toString().trim();
    if (!contactId) return { ok: false, error: "Missing contactId." };

    log('Récupération des données...');
    const res = await utils.sfRequest(opts, `/sobjects/Contact/${encodeURIComponent(contactId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.Id, FirstName: r.FirstName, LastName: r.LastName, Email: r.Email, Phone: r.Phone, AccountId: r.AccountId, CreatedDate: r.CreatedDate };
  }
};
