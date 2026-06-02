const { utils } = require("./utils");

module.exports = {
  async gitlab_project_runner_unassign(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('DELETE', '/projects/{projectId}/runners/{runnerId}', inputs, opts?.credentials, {
      pathParams: ["projectId", "runnerId"]
    });
    if (!res.ok) return res;
    return { ok: true, status: res.status, data: { message: "Runner désassigné du projet." } };
  }
};
