const { utils } = require("./utils");

module.exports = {
  async brevo_contact_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const identifier = (d.identifier || "").trim();
    if (!identifier) return { ok: false, error: "Missing identifier." };

    const res = await utils.brevoRequest(opts, `/contacts/${encodeURIComponent(identifier)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: "Contact supprimé." };
  }
};
