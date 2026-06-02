const { utils } = require("./utils");

module.exports = {
  async gitlab_issue_note_update(node, msg, inputs, opts) {
    return utils.gitlabApi('PUT', '/projects/{projectId}/issues/{issueIid}/notes/{noteId}', inputs, opts?.credentials, {
      pathParams: ["projectId", "issueIid", "noteId"],
      bodyParams: ["body", "confidential", "internal"]
    });
  }
};
