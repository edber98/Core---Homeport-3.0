const { utils } = require("./utils");

module.exports = {
  async salesforce_leads_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 10;

    const soql = `SELECT Id, FirstName, LastName, Email, Phone, Company, Status, CreatedDate FROM Lead ORDER BY CreatedDate DESC LIMIT ${limit}`;
    log('Récupération de la liste...');
    const res = await utils.sfRequest(opts, `/query`, { query: { q: soql } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const records = (res.data && res.data.records) || [];
    const leads = records.map(r => ({ id: r.Id, FirstName: r.FirstName, LastName: r.LastName, Email: r.Email, Phone: r.Phone, Company: r.Company, Status: r.Status, CreatedDate: r.CreatedDate }));
    const totalCount = res.data?.totalSize || 0;
    return { ok: true, totalCount, leads };
  }
};
