const { utils } = require("./utils");

module.exports = {
  async gitlab_issue_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectId = (d.projectId || "").trim();
    const issueIid = (d.issueIid || "").toString().trim();
    if (!projectId || !issueIid) return { ok: false, error: "projectId et issueIid requis." };
    const res = await utils.gitlabApi('DELETE', '/projects/{projectId}/issues/{issueIid}', inputs, opts?.credentials, {
      pathParams: ["projectId", "issueIid"]
    });
    if (!res.ok) return res;
    return { ok: true, status: 204, data: { message: "Issue supprimée." } };
  }
};
