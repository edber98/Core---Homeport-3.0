const { utils } = require("./utils");

module.exports = {
  async salesforce_opportunities_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 10;

    const soql = `SELECT Id, Name, Amount, StageName, CloseDate, AccountId, CreatedDate FROM Opportunity ORDER BY CreatedDate DESC LIMIT ${limit}`;
    log('Récupération de la liste...');
    const res = await utils.sfRequest(opts, `/query`, { query: { q: soql } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const records = (res.data && res.data.records) || [];
    const opportunities = records.map(r => ({ id: r.Id, Name: r.Name, Amount: r.Amount, StageName: r.StageName, CloseDate: r.CloseDate, AccountId: r.AccountId, CreatedDate: r.CreatedDate }));
    const totalCount = res.data?.totalSize || 0;
    return { ok: true, totalCount, opportunities };
  }
};
