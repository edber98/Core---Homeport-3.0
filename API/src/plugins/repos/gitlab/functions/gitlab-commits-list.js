const { utils } = require("./utils");

module.exports = {
  async gitlab_commits_list(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('GET', '/projects/{projectId}/repository/commits', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["ref_name", "since", "until", "per_page"]
    });
    if (!res.ok) return res;
    const rawItems = Array.isArray(res.data) ? res.data : [];
    const commits = rawItems.map(r => ({
      id: r.id, short_id: r.short_id, title: r.title, message: r.message,
      author_name: r.author_name, author_email: r.author_email,
      authored_date: r.authored_date, committed_date: r.committed_date, web_url: r.web_url
    }));
    return { ok: true, commits, totalCount: res.pagination?.total || commits.length };
  }
};
