const { utils } = require("./utils");

module.exports = {
  async gitlab_mr_note_create(node, msg, inputs, opts) {
    return utils.gitlabApi('POST', '/projects/{projectId}/merge_requests/{mrIid}/notes', inputs, opts?.credentials, {
      pathParams: ["projectId", "mrIid"],
      bodyParams: ["body", "created_at", "internal"]
    });
  }
};
