const { utils } = require("./utils");

module.exports = {
  async atera_contact_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.contactId) return { ok: false, error: "Missing contactId." };

    const res = await utils.ateraRequest(opts, `/contacts/${encodeURIComponent(d.contactId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true };
  }
};
