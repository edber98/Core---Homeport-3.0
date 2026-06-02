const { utils } = require("./utils");

module.exports = {
  async gitlab_mr_notes_list(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('GET', '/projects/{projectId}/merge_requests/{mrIid}/notes', inputs, opts?.credentials, {
      pathParams: ["projectId", "mrIid"],
      queryParams: ["sort", "order_by"]
    });
    if (!res.ok) return res;
    const notes = (res.data || []).map(n => ({
      id: n.id,
      body: n.body,
      author: n.author?.name || n.author?.username || n.author?.name_with_namespace || "",
      created_at: n.created_at,
      updated_at: n.updated_at,
      system: n.system
    }));
    return { ok: true, totalCount: res.pagination?.total || notes.length, notes };
  }
};
