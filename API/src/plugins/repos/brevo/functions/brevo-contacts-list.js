const { utils } = require("./utils");

module.exports = {
  async brevo_contacts_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 50;
    const offset = parseInt(d.offset, 10) || 0;

    log('Récupération de la liste...');
    const res = await utils.brevoRequest(opts, "/contacts", { query: { limit, offset } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.contacts) || [];
    const contacts = results.map(r => {
      const attrs = r.attributes || {};
      return { id: String(r.id || ""), email: r.email || "", firstName: attrs.FIRSTNAME || "", lastName: attrs.LASTNAME || "", phone: attrs.SMS || "", createdAt: r.createdAt || "" };
    });
    return { ok: true, contacts, totalCount: res.data?.count || 0 };
  }
};
