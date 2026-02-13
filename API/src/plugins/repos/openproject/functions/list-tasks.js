const { utils } = require("./utils");

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async list_openproject_tasks(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = inputs || {};
    const projectId = toInt(data.project_id);
    const userId = toInt(data.user_id);
    const filters = [];

    if (projectId) {
      filters.push({ project: { operator: "=", values: [projectId] } });
    }

    if (userId) {
      filters.push({ assignee: { operator: "=", values: [userId] } });
    }

    const query = { pageSize: 1000, offset: 0 };
    if (filters.length) query.filters = JSON.stringify(filters);

    log('Récupération de la liste...');
    const res = await utils.openprojectRequest(opts, "/work_packages", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const elements = (res.data && res.data._embedded && res.data._embedded.elements) || [];
    const tasks = elements.map((task) => ({
      id: task.id,
      subject: task.subject,
      description: (task.description && task.description.raw) || "",
      status: task._links && task._links.status ? task._links.status.title : null,
      priority: task._links && task._links.priority ? task._links.priority.title : null,
      startDate: task.startDate,
      dueDate: task.dueDate,
      project: task._links && task._links.project ? task._links.project.title : null,
      assignee: task._links && task._links.assignee ? task._links.assignee.title : null
    }));

    return { ok: true, tasks };
  }
};
