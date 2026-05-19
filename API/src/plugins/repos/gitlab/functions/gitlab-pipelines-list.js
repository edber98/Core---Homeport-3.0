const { utils } = require("./utils");

module.exports = {
  async gitlab_pipelines_list(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('GET', '/projects/{projectId}/pipelines', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["ref", "status", "per_page"]
    });
    if (!res.ok) return res;
    const rawItems = Array.isArray(res.data) ? res.data : [];
    const pipelines = rawItems.map(r => ({
      id: r.id, iid: r.iid, status: r.status, ref: r.ref, sha: r.sha,
      source: r.source, created_at: r.created_at, updated_at: r.updated_at, web_url: r.web_url
    }));
    return { ok: true, pipelines, totalCount: res.pagination?.total || pipelines.length };
  }
};
