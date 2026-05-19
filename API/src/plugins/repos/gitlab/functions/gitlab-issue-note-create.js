const { utils } = require("./utils");

module.exports = {
  async gitlab_issue_note_create(node, msg, inputs, opts) {
    return utils.gitlabApi('POST', '/projects/{projectId}/issues/{issueIid}/notes', inputs, opts?.credentials, {
      pathParams: ["projectId", "issueIid"],
      bodyParams: ["body"]
    });
  }
};
