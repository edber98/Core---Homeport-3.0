const { utils } = require("./utils");

module.exports = {
  async gitlab_pipeline_get(node, msg, inputs, opts) {
    return utils.gitlabApi('GET', '/projects/{projectId}/pipelines/{pipelineId}', inputs, opts?.credentials, {
      pathParams: ["projectId", "pipelineId"]
    });
  }
};
