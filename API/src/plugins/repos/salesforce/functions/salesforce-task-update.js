const { utils } = require("./utils");

module.exports = {
  async salesforce_task_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const taskId = (d.taskId || "").toString().trim();
    if (!taskId) return { ok: false, error: "Missing taskId." };

    const body = {};
    if (d.Subject) body.Subject = d.Subject;
    if (d.Status) body.Status = d.Status;
    if (d.Priority) body.Priority = d.Priority;
    if (d.WhoId) body.WhoId = d.WhoId;
    if (d.WhatId) body.WhatId = d.WhatId;
    if (d.ActivityDate) body.ActivityDate = d.ActivityDate;
    if (Object.keys(body).length === 0) return { ok: false, error: "No fields to update." };

    const res = await utils.sfRequest(opts, `/sobjects/Task/${encodeURIComponent(taskId)}`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const getRes = await utils.sfRequest(opts, `/sobjects/Task/${encodeURIComponent(taskId)}`);
    if (!getRes.ok) return { ok: true, id: taskId, status: "updated" };
    const r = getRes.data || {};
    return { ok: true, id: r.Id, Subject: r.Subject, Status: r.Status, Priority: r.Priority, WhoId: r.WhoId, WhatId: r.WhatId, ActivityDate: r.ActivityDate, CreatedDate: r.CreatedDate };
  }
};
