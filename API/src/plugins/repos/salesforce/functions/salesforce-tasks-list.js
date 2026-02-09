const { utils } = require("./utils");

module.exports = {
  async salesforce_tasks_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 10;

    const soql = `SELECT Id, Subject, Status, Priority, WhoId, ActivityDate, CreatedDate FROM Task ORDER BY CreatedDate DESC LIMIT ${limit}`;
    const res = await utils.sfRequest(opts, `/query`, { query: { q: soql } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const records = (res.data && res.data.records) || [];
    const tasks = records.map(r => ({ id: r.Id, Subject: r.Subject, Status: r.Status, Priority: r.Priority, WhoId: r.WhoId, ActivityDate: r.ActivityDate, CreatedDate: r.CreatedDate }));
    return { ok: true, tasks };
  }
};
