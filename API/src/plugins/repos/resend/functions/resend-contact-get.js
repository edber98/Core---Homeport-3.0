const { utils } = require("./utils");

module.exports = {
  async resend_contact_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const contactId = String(d.contactId || d.email || "").trim();
    if (!contactId) return { ok: false, error: "ID ou email du contact requis." };

    const res = await utils.resendRequest(opts, `/contacts/${encodeURIComponent(contactId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactContact(res.data || {}) };
  }
};
