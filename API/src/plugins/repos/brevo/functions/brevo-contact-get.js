const { utils } = require("./utils");

module.exports = {
  async brevo_contact_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const identifier = (d.identifier || "").trim();
    if (!identifier) return { ok: false, error: "Missing identifier." };

    log('Récupération des données...');
    const res = await utils.brevoRequest(opts, `/contacts/${encodeURIComponent(identifier)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const attrs = r.attributes || {};
    return { ok: true, id: String(r.id || ""), email: r.email || "", firstName: attrs.FIRSTNAME || "", lastName: attrs.LASTNAME || "", phone: attrs.SMS || "", createdAt: r.createdAt || "" };
  }
};
