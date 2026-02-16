const { utils } = require("./utils");

module.exports = {
  async salesforce_contact_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = (d.query || "").trim();
    if (!query) return { ok: false, error: "Missing query." };
    const limit = parseInt(d.limit, 10) || 10;

    const sosl = `FIND {${query}} IN ALL FIELDS RETURNING Contact(Id, FirstName, LastName, Email, Phone, AccountId, CreatedDate LIMIT ${limit})`;
    log('Recherche en cours...');
    const res = await utils.sfRequest(opts, `/search`, { query: { q: sosl } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.searchRecords) || [];
    const contacts = results.map(r => ({ id: r.Id, FirstName: r.FirstName, LastName: r.LastName, Email: r.Email, Phone: r.Phone, AccountId: r.AccountId, CreatedDate: r.CreatedDate }));
    return { ok: true, contacts , totalCount: contacts.length };
  }
};
