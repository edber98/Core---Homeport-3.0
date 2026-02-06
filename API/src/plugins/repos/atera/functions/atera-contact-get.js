const { utils } = require("./utils");

module.exports = {
  async atera_contact_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.contactId) return { ok: false, error: "Missing contactId." };

    const res = await utils.ateraRequest(opts, `/contacts/${encodeURIComponent(d.contactId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
