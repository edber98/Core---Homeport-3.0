const { utils } = require("./utils");

module.exports = {
  async gitlab_branch_delete(node, msg, inputs, opts) {
    return utils.gitlabApi('DELETE', '/projects/{projectId}/repository/branches/{branch}', inputs, opts?.credentials, {
      pathParams: ["projectId", "branch"]
    });
  }
};
