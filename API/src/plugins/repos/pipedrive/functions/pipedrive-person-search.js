const { utils } = require("./utils");

module.exports = {
  async pipedrive_person_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const term = (d.term || "").trim();
    if (!term) return { ok: false, error: "Missing term." };
    const limit = parseInt(d.limit, 10) || 10;

    log('Recherche en cours...');
    const res = await utils.pdRequest(opts, "/persons/search", { query: { term, limit } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const items = (res.data && res.data.items) || [];
    const persons = items.map(i => { const r = i.item || {}; return { id: r.id, name: r.name, email: r.primary_email, phone: r.primary_phone, org_id: r.organization?.id, add_time: "" }; });
    return { ok: true, persons };
  }
};
