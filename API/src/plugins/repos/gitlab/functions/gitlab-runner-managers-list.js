const { utils } = require("./utils");

module.exports = {
  async gitlab_runner_managers_list(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('GET', '/runners/{runnerId}/managers', inputs, opts?.credentials, {
      pathParams: ["runnerId"]
    });
    if (!res.ok) return res;
    const managers = (res.data || []).map(m => ({
      id: m.id,
      system_id: m.system_id,
      version: m.version,
      revision: m.revision,
      platform: m.platform,
      architecture: m.architecture,
      created_at: m.created_at,
      contacted_at: m.contacted_at,
      ip_address: m.ip_address,
      status: m.status,
      job_execution_status: m.job_execution_status
    }));
    return { ok: true, totalCount: managers.length, managers };
  }
};
