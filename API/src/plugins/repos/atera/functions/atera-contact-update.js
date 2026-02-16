const { utils } = require("./utils");

module.exports = {
  async atera_contact_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.contactId) return { ok: false, error: "Missing contactId." };

    const body = {};
    if (d.Firstname) body.Firstname = d.Firstname;
    if (d.Lastname) body.Lastname = d.Lastname;
    if (d.JobTitle) body.JobTitle = d.JobTitle;
    if (d.Phone) body.Phone = d.Phone;

    log('Mise à jour en cours...');
    const res = await utils.ateraRequest(opts, `/contacts/${encodeURIComponent(d.contactId)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ActionID: res.data?.ActionID };
  }
};
