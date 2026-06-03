const { utils } = require("./utils");

module.exports = {
  async gitlab_pipeline_create(node, msg, inputs, opts) {
    return utils.gitlabApi('POST', '/projects/{projectId}/pipeline', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["ref"]
    });
  }
};
