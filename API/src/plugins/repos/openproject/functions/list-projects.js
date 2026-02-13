const { utils } = require("./utils");

module.exports = {
  async list_openproject_projects(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la liste...');
    const res = await utils.openprojectRequest(opts, "/projects", {
      query: { pageSize: 1000, offset: 0 }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const elements = (res.data && res.data._embedded && res.data._embedded.elements) || [];
    const projects = elements.map((project) => ({
      id: project.id,
      name: project.name,
      identifier: project.identifier,
      status: project.status,
      description: (project.description && project.description.raw) || ""
    }));

    return { ok: true, projects };
  }
};
