const { utils } = require("./utils");

module.exports = {
  async fd_contact_delete(node, msg, inputs, opts) {
    const contactId = parseInt((inputs || {}).contactId, 10);
    if (!Number.isFinite(contactId) || contactId <= 0) return { ok: false, error: "Missing or invalid contactId." };

    const res = await utils.freshdeskRequest(opts, `/contacts/${contactId}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, success: "true", id: String(contactId), event: "contact_deleted" };
  }
};
