const { utils } = require("./utils");

module.exports = {
  async gitlab_issue_update(node, msg, inputs, opts) {
    return utils.gitlabApi('PUT', '/projects/{projectId}/issues/{issueIid}', inputs, opts?.credentials, {
      pathParams: ["projectId", "issueIid"],
      bodyParams: ["title", "description", "state_event", "labels", "assignee_ids"]
    });
  }
};
