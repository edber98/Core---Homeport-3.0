const { utils } = require("./utils");

module.exports = {
  async gitlab_pipeline_retry(node, msg, inputs, opts) {
    return utils.gitlabApi('POST', '/projects/{projectId}/pipelines/{pipelineId}/retry', inputs, opts?.credentials, {
      pathParams: ["projectId", "pipelineId"]
    });
  }
};
