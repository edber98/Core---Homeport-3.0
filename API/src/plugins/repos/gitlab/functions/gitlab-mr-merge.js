const { utils } = require("./utils");

module.exports = {
  async gitlab_mr_merge(node, msg, inputs, opts) {
    return utils.gitlabApi('PUT', '/projects/{projectId}/merge_requests/{mrIid}/merge', inputs, opts?.credentials, {
      pathParams: ["projectId", "mrIid"],
      bodyParams: ["merge_commit_message", "squash", "should_remove_source_branch"]
    });
  }
};
