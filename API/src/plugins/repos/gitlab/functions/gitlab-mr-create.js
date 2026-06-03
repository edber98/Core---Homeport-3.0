const { utils } = require("./utils");

module.exports = {
  async gitlab_mr_create(node, msg, inputs, opts) {
    return utils.gitlabApi('POST', '/projects/{projectId}/merge_requests', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["title", "source_branch", "target_branch", "description", "assignee_id", "labels"]
    });
  }
};
