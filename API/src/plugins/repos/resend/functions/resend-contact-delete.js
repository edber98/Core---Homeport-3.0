const { utils } = require("./utils");

module.exports = {
  async resend_contact_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const contactId = String(d.contactId || d.email || "").trim();
    if (!contactId) return { ok: false, error: "ID ou email du contact requis." };

    log("Suppression du contact Resend...");
    const res = await utils.resendRequest(opts, `/contacts/${encodeURIComponent(contactId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: contactId, success: true };
  }
};
