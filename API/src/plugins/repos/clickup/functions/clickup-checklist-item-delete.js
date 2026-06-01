const { utils } = require("./utils");

module.exports = {
  async clickup_checklist_item_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const checklistId = String(d.checklistId || "").trim();
    const checklistItemId = String(d.checklistItemId || "").trim();
    if (!checklistId) return { ok: false, error: "Missing checklistId." };
    if (!checklistItemId) return { ok: false, error: "Missing checklistItemId." };

    const res = await utils.clickupRequest(opts, `/checklist/${encodeURIComponent(checklistId)}/checklist_item/${encodeURIComponent(checklistItemId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: checklistItemId, success: "true" };
  }
};
