const { utils } = require("./utils");

module.exports = {
  async clickup_checklist_item_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const checklistId = String(d.checklistId || "").trim();
    const checklistItemId = String(d.checklistItemId || "").trim();
    if (!checklistId) return { ok: false, error: "Missing checklistId." };
    if (!checklistItemId) return { ok: false, error: "Missing checklistItemId." };

    const body = {};
    if (d.name) body.name = d.name;
    if (d.resolved !== undefined && d.resolved !== null && d.resolved !== "") body.resolved = ["1","true","yes","on"].includes(String(d.resolved).toLowerCase());
    if (d.assignee) body.assignee = Number(d.assignee);
    if (!Object.keys(body).length) return { ok: false, error: "No fields to update." };

    const res = await utils.clickupRequest(opts, `/checklist/${encodeURIComponent(checklistId)}/checklist_item/${encodeURIComponent(checklistItemId)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: String(r.id || checklistItemId), name: r.name || "", status: r.resolved ? "done" : "open", data: r };
  }
};
