const { utils } = require("./utils");

module.exports = {
  async gitlab_commit_get(node, msg, inputs, opts) {
    return utils.gitlabApi('GET', '/projects/{projectId}/repository/commits/{sha}', inputs, opts?.credentials, {
      pathParams: ["projectId", "sha"]
    });
  }
};
