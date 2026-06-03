const { utils } = require("./utils");

module.exports = {
  async gitlab_mr_delete(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('DELETE', '/projects/{projectId}/merge_requests/{mrIid}', inputs, opts?.credentials, {
      pathParams: ["projectId", "mrIid"]
    });
    if (!res.ok) return res;
    return { ok: true, status: 204, data: { message: "Merge request supprimée." } };
  }
};
