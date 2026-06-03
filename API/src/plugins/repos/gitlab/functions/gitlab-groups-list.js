const { utils } = require("./utils");

module.exports = {
  async gitlab_groups_list(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('GET', '/groups', inputs, opts?.credentials, {
      queryParams: ["search", "per_page"]
    });
    if (!res.ok) return res;
    const rawItems = Array.isArray(res.data) ? res.data : [];
    const groups = rawItems.map(r => ({
      id: r.id, name: r.name, path: r.path, description: r.description,
      visibility: r.visibility, web_url: r.web_url, created_at: r.created_at
    }));
    return { ok: true, groups, totalCount: res.pagination?.total || groups.length };
  }
};
