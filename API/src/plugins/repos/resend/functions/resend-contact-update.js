const { utils } = require("./utils");

module.exports = {
  async resend_contact_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const contactId = String(d.contactId || d.email || "").trim();
    if (!contactId) return { ok: false, error: "ID ou email du contact requis." };

    const body = {};
    if (d.email && d.contactId) body.email = String(d.email).trim();
    if (d.firstName !== undefined) body.firstName = String(d.firstName || "");
    if (d.lastName !== undefined) body.lastName = String(d.lastName || "");
    if (d.unsubscribed !== undefined && d.unsubscribed !== "") body.unsubscribed = utils.parseBoolean(d.unsubscribed, false);
    if (d.properties) {
      try { body.properties = utils.parseJsonInput(d.properties, "Propriétés"); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (!Object.keys(body).length) return { ok: false, error: "Aucun champ à modifier." };

    log("Mise à jour du contact Resend...");
    const res = await utils.resendRequest(opts, `/contacts/${encodeURIComponent(contactId)}`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: res.data?.id || contactId, success: true };
  }
};
