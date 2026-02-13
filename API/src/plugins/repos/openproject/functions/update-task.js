const { utils } = require("./utils");

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStr(value) {
  const str = String(value || "").trim();
  return str || null;
}

module.exports = {
  async update_openproject_task(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = inputs || {};
    const taskId = toInt(data.task_id);
    if (!taskId) return { ok: false, error: "Missing task_id." };

    const getRes = await utils.openprojectRequest(opts, `/work_packages/${taskId}`);
    if (!getRes.ok) return { ok: false, error: getRes.error, status: getRes.status, details: getRes.details };

    const lockVersion = getRes.data ? getRes.data.lockVersion : null;
    const etagValue = getRes.headers ? getRes.headers.etag : null;

    if (!lockVersion) return { ok: false, error: "Missing lockVersion from OpenProject." };
    if (!etagValue) return { ok: false, error: "Missing ETag from OpenProject." };

    const payload = { lockVersion, _links: {} };

    const title = toStr(data.title);
    const description = toStr(data.description);
    const startDate = toStr(data.startDate);
    const dueDate = toStr(data.dueDate);
    const typeId = toInt(data.type_id);
    const statusId = toInt(data.status_id);
    const priorityId = toInt(data.priority_id);
    const userId = toInt(data.user_id);

    if (title) payload.subject = title;
    if (description) payload.description = { format: "markdown", raw: description };
    if (startDate) payload.startDate = startDate;
    if (dueDate) payload.dueDate = dueDate;
    if (typeId) payload._links.type = { href: `/api/v3/types/${typeId}` };
    if (statusId) payload._links.status = { href: `/api/v3/statuses/${statusId}` };
    if (priorityId) payload._links.priority = { href: `/api/v3/priorities/${priorityId}` };
    if (userId) payload._links.assignee = { href: `/api/v3/users/${userId}` };

    const hasBody = !!(payload.subject || payload.description || payload.startDate || payload.dueDate);
    const hasLinks = Object.keys(payload._links).length > 0;
    if (!hasBody && !hasLinks) return { ok: false, error: "No fields to update." };

    const headers = { "If-Match": etagValue };

    const patchRes = await utils.openprojectRequest(opts, `/work_packages/${taskId}`, {
      method: "PATCH",
      headers,
      body: payload
    });

    if (!patchRes.ok) return { ok: false, error: patchRes.error, status: patchRes.status, details: patchRes.details };

    return { ok: true, task: patchRes.data };
  }
};
