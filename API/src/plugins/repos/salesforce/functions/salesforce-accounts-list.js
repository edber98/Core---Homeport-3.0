const { utils } = require("./utils");

module.exports = {
  async salesforce_accounts_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 10;

    const soql = `SELECT Id, Name, Industry, Phone, Website, CreatedDate FROM Account ORDER BY CreatedDate DESC LIMIT ${limit}`;
    const res = await utils.sfRequest(opts, `/query`, { query: { q: soql } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const records = (res.data && res.data.records) || [];
    const accounts = records.map(r => ({ id: r.Id, Name: r.Name, Industry: r.Industry, Phone: r.Phone, Website: r.Website, CreatedDate: r.CreatedDate }));
    return { ok: true, accounts };
  }
};
