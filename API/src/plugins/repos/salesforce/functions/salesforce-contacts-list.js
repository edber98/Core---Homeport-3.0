const { utils } = require("./utils");

module.exports = {
  async salesforce_contacts_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 10;

    const soql = `SELECT Id, FirstName, LastName, Email, Phone, AccountId, CreatedDate FROM Contact ORDER BY CreatedDate DESC LIMIT ${limit}`;
    const res = await utils.sfRequest(opts, `/query`, { query: { q: soql } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const records = (res.data && res.data.records) || [];
    const contacts = records.map(r => ({ id: r.Id, FirstName: r.FirstName, LastName: r.LastName, Email: r.Email, Phone: r.Phone, AccountId: r.AccountId, CreatedDate: r.CreatedDate }));
    const totalCount = res.data?.totalSize || 0;
    return { ok: true, totalCount, contacts };
  }
};
