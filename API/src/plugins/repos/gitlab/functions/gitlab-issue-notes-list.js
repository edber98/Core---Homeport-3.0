const { utils } = require("./utils");

module.exports = {
  async gitlab_issue_notes_list(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('GET', '/projects/{projectId}/issues/{issueIid}/notes', inputs, opts?.credentials, {
      pathParams: ["projectId", "issueIid"],
      queryParams: ["sort", "order_by", "activity_filter"]
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
