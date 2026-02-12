const { utils } = require("./utils");

module.exports = {
  async salesforce_cases_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 10;

    const soql = `SELECT Id, Subject, Status, Priority, ContactId, CreatedDate FROM Case ORDER BY CreatedDate DESC LIMIT ${limit}`;
    const res = await utils.sfRequest(opts, `/query`, { query: { q: soql } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const records = (res.data && res.data.records) || [];
    const cases = records.map(r => ({ id: r.Id, Subject: r.Subject, Status: r.Status, Priority: r.Priority, ContactId: r.ContactId, CreatedDate: r.CreatedDate }));
    const totalCount = res.data?.totalSize || 0;
    return { ok: true, totalCount, cases };
  }
};
