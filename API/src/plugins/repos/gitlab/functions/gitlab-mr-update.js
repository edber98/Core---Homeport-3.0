const { utils } = require("./utils");

module.exports = {
  async gitlab_mr_update(node, msg, inputs, opts) {
    return utils.gitlabApi('PUT', '/projects/{projectId}/merge_requests/{mrIid}', inputs, opts?.credentials, {
      pathParams: ["projectId", "mrIid"],
      bodyParams: ["title", "description", "state_event", "labels"]
    });
  }
};
