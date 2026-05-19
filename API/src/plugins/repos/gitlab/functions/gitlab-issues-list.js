const { utils } = require("./utils");

module.exports = {
  async gitlab_issues_list(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('GET', '/projects/{projectId}/issues', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["state", "labels", "search", "per_page"]
    });
    if (!res.ok) return res;
    const rawItems = Array.isArray(res.data) ? res.data : [];
    const issues = rawItems.map(r => ({
      id: r.id, iid: r.iid, title: r.title, description: r.description,
      state: r.state, labels: r.labels, web_url: r.web_url,
      created_at: r.created_at, updated_at: r.updated_at, closed_at: r.closed_at,
      author: r.author?.name, assignee: r.assignee?.name
    }));
    return { ok: true, issues, totalCount: res.pagination?.total || issues.length };
  }
};
