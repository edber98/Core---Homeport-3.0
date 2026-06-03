const { utils } = require("./utils");

module.exports = {
  async clickup_task_custom_field_set(node, msg, inputs, opts) {
    const d = inputs || {};
    const taskId = String(d.taskId || "").trim();
    const fieldId = String(d.fieldId || "").trim();
    if (!taskId) return { ok: false, error: "Missing taskId." };
    if (!fieldId) return { ok: false, error: "Missing fieldId." };

    let value;
    try { value = d.value && typeof d.value === 'string' ? JSON.parse(d.value) : d.value; }
    catch { return { ok: false, error: "JSON invalide dans value." }; }
    if (value === undefined) return { ok: false, error: "Missing value." };

    const res = await utils.clickupRequest(opts, `/task/${encodeURIComponent(taskId)}/field/${encodeURIComponent(fieldId)}`, { method: "POST", body: { value } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: taskId, status: "updated", message: "Champ personnalisé mis à jour." };
  }
};
