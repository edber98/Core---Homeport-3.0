const { utils } = require("./utils");

module.exports = {
  async gitlab_issue_get(node, msg, inputs, opts) {
    return utils.gitlabApi('GET', '/projects/{projectId}/issues/{issueIid}', inputs, opts?.credentials, {
      pathParams: ["projectId", "issueIid"]
    });
  }
};
