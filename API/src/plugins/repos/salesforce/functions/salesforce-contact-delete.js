const { utils } = require("./utils");

module.exports = {
  async salesforce_contact_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const contactId = (d.contactId || "").toString().trim();
    if (!contactId) return { ok: false, error: "Missing contactId." };

    const res = await utils.sfRequest(opts, `/sobjects/Contact/${encodeURIComponent(contactId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Contact ${contactId} deleted.` };
  }
};
