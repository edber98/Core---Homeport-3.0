const { utils } = require("./utils");

module.exports = {
  async list_openproject_task_types(node, msg, inputs, opts) {
    const res = await utils.openprojectRequest(opts, "/types");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const elements = (res.data && res.data._embedded && res.data._embedded.elements) || [];
    const types = elements.map((type) => ({
      id: type.id,
      name: type.name,
      description: type.description || ""
    }));

    return { ok: true, types };
  }
};
