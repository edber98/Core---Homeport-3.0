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
  async add_openproject_task(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = inputs || {};
    const title = toStr(data.title);
    const description = toStr(data.description);
    const projectId = toInt(data.project_id);
    const userId = toInt(data.user_id);

    if (!title) return { ok: false, error: "Missing title." };
    if (!projectId) return { ok: false, error: "Missing project_id." };
    if (!userId) return { ok: false, error: "Missing user_id." };

    const typeId = toInt(data.type_id);
    const statusId = toInt(data.status_id);
    const priorityId = toInt(data.priority_id);
    const startDate = toStr(data.startDate);
    const dueDate = toStr(data.dueDate);

    const payload = {
      subject: title,
      _links: {
        project: { href: `/api/v3/projects/${projectId}` },
        assignee: { href: `/api/v3/users/${userId}` }
      }
    };

    if (description) {
      payload.description = { format: "markdown", raw: description };
    }
    if (startDate) payload.startDate = startDate;
    if (dueDate) payload.dueDate = dueDate;
    if (typeId) payload._links.type = { href: `/api/v3/types/${typeId}` };
    if (statusId) payload._links.status = { href: `/api/v3/statuses/${statusId}` };
    if (priorityId) payload._links.priority = { href: `/api/v3/priorities/${priorityId}` };

    log('Création en cours...');
    const res = await utils.openprojectRequest(opts, "/work_packages", {
      method: "POST",
      body: payload
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, task: res.data };
  }
};
