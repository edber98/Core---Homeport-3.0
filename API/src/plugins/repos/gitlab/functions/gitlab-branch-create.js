const { utils } = require("./utils");

module.exports = {
  async gitlab_branch_create(node, msg, inputs, opts) {
    return utils.gitlabApi('POST', '/projects/{projectId}/repository/branches', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["branch", "ref"]
    });
  }
};
