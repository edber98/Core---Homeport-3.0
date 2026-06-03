const { utils } = require("./utils");

module.exports = {
  async gitlab_releases_list(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('GET', '/projects/{projectId}/releases', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["per_page"]
    });
    if (!res.ok) return res;
    const rawItems = Array.isArray(res.data) ? res.data : [];
    const releases = rawItems.map(r => ({
      tag_name: r.tag_name, name: r.name, description: r.description,
      created_at: r.created_at, released_at: r.released_at
    }));
    return { ok: true, releases, totalCount: res.pagination?.total || releases.length };
  }
};
