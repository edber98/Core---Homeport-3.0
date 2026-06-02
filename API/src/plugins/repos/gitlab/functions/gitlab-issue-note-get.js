const { utils } = require("./utils");

module.exports = {
  async gitlab_issue_note_get(node, msg, inputs, opts) {
    return utils.gitlabApi('GET', '/projects/{projectId}/issues/{issueIid}/notes/{noteId}', inputs, opts?.credentials, {
      pathParams: ["projectId", "issueIid", "noteId"]
    });
  }
};
