const { utils } = require("./utils");

module.exports = {
  async clickup_checklist_item_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const checklistId = String(d.checklistId || "").trim();
    const name = String(d.name || "").trim();
    if (!checklistId) return { ok: false, error: "Missing checklistId." };
    if (!name) return { ok: false, error: "Missing name." };

    const body = { name };
    if (d.assignee) body.assignee = Number(d.assignee);

    const res = await utils.clickupRequest(opts, `/checklist/${encodeURIComponent(checklistId)}/checklist_item`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), name: r.name || name, status: r.resolved ? "done" : "open", data: r };
  }
};
