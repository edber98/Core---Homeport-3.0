const { utils } = require("./utils");

module.exports = {
  async gitlab_branches_list(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('GET', '/projects/{projectId}/repository/branches', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["search", "per_page"]
    });
    if (!res.ok) return res;
    const rawItems = Array.isArray(res.data) ? res.data : [];
    const branches = rawItems.map(r => ({
      name: r.name, merged: r.merged, protected: r.protected, default: r.default,
      web_url: r.web_url,
      commit_id: r.commit?.short_id, commit_title: r.commit?.title,
      commit_author: r.commit?.author_name, commit_date: r.commit?.created_at
    }));
    return { ok: true, branches, totalCount: res.pagination?.total || branches.length };
  }
};
