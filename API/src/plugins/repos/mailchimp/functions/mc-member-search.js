const { utils } = require("./utils");

module.exports = {
  async mc_member_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.query) return { ok: false, error: "Missing query." };

    log('Recherche en cours...');
    const res = await utils.mailchimpRequest(opts, "/search-members", { query: { query: d.query } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const matches = (res.data && res.data.exact_matches && res.data.exact_matches.members) || [];
    const full = (res.data && res.data.full_search && res.data.full_search.members) || [];
    const all = [...matches, ...full];
    const members = all.map(r => ({ id: r.id || "", email: r.email_address || "", firstName: r.merge_fields?.FNAME || "", lastName: r.merge_fields?.LNAME || "", status: r.status || "" }));
    return { ok: true, members , totalCount: members.length };
  }
};
