const { utils } = require("./utils");

module.exports = {
  async gitlab_mr_note_get(node, msg, inputs, opts) {
    return utils.gitlabApi('GET', '/projects/{projectId}/merge_requests/{mrIid}/notes/{noteId}', inputs, opts?.credentials, {
      pathParams: ["projectId", "mrIid", "noteId"]
    });
  }
};
