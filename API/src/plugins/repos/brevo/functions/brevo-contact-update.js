const { utils } = require("./utils");

module.exports = {
  async brevo_contact_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const email = (d.email || "").trim();
    if (!email) return { ok: false, error: "Missing email." };

    const body = { attributes: {} };
    if (d.firstName) body.attributes.FIRSTNAME = d.firstName;
    if (d.lastName) body.attributes.LASTNAME = d.lastName;
    if (d.phone) body.attributes.SMS = d.phone;
    if (d.attributes) {
      try { Object.assign(body.attributes, JSON.parse(d.attributes)); } catch {}
    }

    log('Mise à jour en cours...');
    const res = await utils.brevoRequest(opts, `/contacts/${encodeURIComponent(email)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, id: "", email, firstName: d.firstName || "", lastName: d.lastName || "", phone: d.phone || "", createdAt: "" };
  }
};
