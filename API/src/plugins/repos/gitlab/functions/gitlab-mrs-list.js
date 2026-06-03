const { utils } = require("./utils");

module.exports = {
  async gitlab_mrs_list(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('GET', '/projects/{projectId}/merge_requests', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["state", "labels", "search", "per_page"]
    });
    if (!res.ok) return res;
    const rawItems = Array.isArray(res.data) ? res.data : [];
    const merge_requests = rawItems.map(r => ({
      id: r.id, iid: r.iid, title: r.title, description: r.description,
      state: r.state, source_branch: r.source_branch, target_branch: r.target_branch,
      labels: r.labels, web_url: r.web_url,
      created_at: r.created_at, updated_at: r.updated_at, merged_at: r.merged_at,
      author: r.author?.name
    }));
    return { ok: true, merge_requests, totalCount: res.pagination?.total || merge_requests.length };
  }
};
