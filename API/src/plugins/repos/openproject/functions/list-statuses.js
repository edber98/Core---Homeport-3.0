const { utils } = require("./utils");

module.exports = {
  async list_openproject_task_statuses(node, msg, inputs, opts) {
    const res = await utils.openprojectRequest(opts, "/statuses");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const elements = (res.data && res.data._embedded && res.data._embedded.elements) || [];
    const statuses = elements.map((status) => ({
      id: status.id,
      name: status.name,
      isClosed: status.isClosed
    }));

    return { ok: true, statuses };
  }
};
