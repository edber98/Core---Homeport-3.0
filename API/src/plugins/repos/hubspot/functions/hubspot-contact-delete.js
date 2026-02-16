const { utils } = require("./utils");

module.exports = {
  async hubspot_contact_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const contactId = (d.contactId || "").toString().trim();
    if (!contactId) return { ok: false, error: "Missing contactId." };

    log('Suppression en cours...');
    const res = await utils.hubspotRequest(opts, `/crm/v3/objects/contacts/${encodeURIComponent(contactId)}`, {
      method: "DELETE"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Contact ${contactId} deleted.` };
  }
};
