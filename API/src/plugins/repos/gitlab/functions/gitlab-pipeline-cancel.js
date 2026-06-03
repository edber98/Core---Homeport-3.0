const { utils } = require("./utils");

module.exports = {
  async gitlab_pipeline_cancel(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('POST', '/projects/{projectId}/pipelines/{pipelineId}/cancel', inputs, opts?.credentials, {
      pathParams: ["projectId", "pipelineId"]
    });
    if (!res.ok) return res;
    return { ok: true, status: res.status, data: { message: "Pipeline annulée." } };
  }
};
