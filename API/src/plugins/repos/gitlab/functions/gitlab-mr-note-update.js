const { utils } = require("./utils");

module.exports = {
  async gitlab_mr_note_update(node, msg, inputs, opts) {
    return utils.gitlabApi('PUT', '/projects/{projectId}/merge_requests/{mrIid}/notes/{noteId}', inputs, opts?.credentials, {
      pathParams: ["projectId", "mrIid", "noteId"],
      bodyParams: ["body", "confidential", "internal"]
    });
  }
};
