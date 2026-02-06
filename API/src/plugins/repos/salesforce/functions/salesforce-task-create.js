const { utils } = require("./utils");

module.exports = {
  async salesforce_task_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const Subject = (d.Subject || "").trim();
    if (!Subject) return { ok: false, error: "Missing Subject." };

    const body = { Subject };
    if (d.Status) body.Status = d.Status;
    if (d.Priority) body.Priority = d.Priority;
    if (d.WhoId) body.WhoId = d.WhoId;
    if (d.WhatId) body.WhatId = d.WhatId;
    if (d.ActivityDate) body.ActivityDate = d.ActivityDate;

    const res = await utils.sfRequest(opts, "/sobjects/Task", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const getRes = await utils.sfRequest(opts, `/sobjects/Task/${res.data.id}`);
    if (!getRes.ok) return { ok: true, id: res.data.id };
    const r = getRes.data || {};
    return { ok: true, id: r.Id, Subject: r.Subject, Status: r.Status, Priority: r.Priority, WhoId: r.WhoId, WhatId: r.WhatId, ActivityDate: r.ActivityDate, CreatedDate: r.CreatedDate };
  }
};
