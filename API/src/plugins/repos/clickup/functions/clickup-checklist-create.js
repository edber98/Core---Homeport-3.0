const { utils } = require("./utils");

module.exports = {
  async clickup_checklist_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const taskId = String(d.taskId || "").trim();
    const name = String(d.name || "").trim();
    if (!taskId) return { ok: false, error: "Missing taskId." };
    if (!name) return { ok: false, error: "Missing name." };

    const res = await utils.clickupRequest(opts, `/task/${encodeURIComponent(taskId)}/checklist`, { method: "POST", body: { name } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), name: r.name || name, status: "created", data: r };
  }
};
