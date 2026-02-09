const { utils } = require("./utils");

module.exports = {
  async intercom_contact_archive(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.contactId || "").trim()) return { ok: false, error: "Missing contactId." };

    const res = await utils.intercomRequest(opts, `/contacts/${d.contactId}/archive`, { method: "POST" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "archived", message: "Contact archivé." };
  }
};
