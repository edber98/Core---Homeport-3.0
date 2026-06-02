const { utils } = require("./utils");

module.exports = {
  async gitlab_project_runner_assign(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('POST', '/projects/{projectId}/runners', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["runner_id"]
    });
    if (!res.ok) return res;
    return { ok: true, status: res.status, data: res.data };
  }
};
