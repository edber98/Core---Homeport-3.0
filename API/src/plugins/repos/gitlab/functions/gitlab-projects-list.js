const { utils } = require("./utils");

module.exports = {
  async gitlab_projects_list(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('GET', '/projects', inputs, opts?.credentials, {
      queryParams: ["search", "owned", "membership", "per_page"]
    });
    if (!res.ok) return res;
    const rawItems = Array.isArray(res.data) ? res.data : [];
    const projects = rawItems.map(r => ({
      id: r.id, name: r.name, path_with_namespace: r.path_with_namespace,
      description: r.description, visibility: r.visibility, default_branch: r.default_branch,
      web_url: r.web_url, created_at: r.created_at, last_activity_at: r.last_activity_at,
      star_count: r.star_count, forks_count: r.forks_count
    }));
    return { ok: true, projects, totalCount: res.pagination?.total || projects.length };
  }
};
