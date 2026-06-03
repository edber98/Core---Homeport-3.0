const { utils } = require("./utils");

module.exports = {
  async gitlab_runner_jobs_list(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('GET', '/runners/{runnerId}/jobs', inputs, opts?.credentials, {
      pathParams: ["runnerId"],
      queryParams: ["system_id", "status", "order_by", "sort", "page", "per_page"]
    });
    if (!res.ok) return res;
    const jobs = (res.data || []).map(j => ({
      id: j.id,
      status: j.status,
      stage: j.stage,
      name: j.name,
      ref: j.ref,
      created_at: j.created_at,
      started_at: j.started_at,
      finished_at: j.finished_at,
      duration: j.duration,
      pipeline: j.pipeline?.id || j.pipeline_id
    }));
    return { ok: true, totalCount: res.pagination?.total || jobs.length, jobs };
  }
};
