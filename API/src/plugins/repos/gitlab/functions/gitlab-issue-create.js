const { utils } = require("./utils");

module.exports = {
  async gitlab_issue_create(node, msg, inputs, opts) {
    return utils.gitlabApi('POST', '/projects/{projectId}/issues', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["title", "description", "labels", "assignee_ids", "milestone_id", "confidential"]
    });
  }
};
