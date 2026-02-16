const { utils } = require("./utils");

module.exports = {
  async salesforce_task_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const taskId = (d.taskId || "").toString().trim();
    if (!taskId) return { ok: false, error: "Missing taskId." };

    log('Récupération des données...');
    const res = await utils.sfRequest(opts, `/sobjects/Task/${encodeURIComponent(taskId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.Id, Subject: r.Subject, Status: r.Status, Priority: r.Priority, WhoId: r.WhoId, WhatId: r.WhatId, ActivityDate: r.ActivityDate, CreatedDate: r.CreatedDate };
  }
};
