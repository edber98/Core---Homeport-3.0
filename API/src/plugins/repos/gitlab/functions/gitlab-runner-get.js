const { utils } = require("./utils");

function mapRunner(r) {
  return {
    id: r.id,
    description: r.description,
    active: r.active,
    paused: r.paused,
    is_shared: r.is_shared,
    runner_type: r.runner_type,
    name: r.name,
    online: r.online,
    status: r.status,
    job_execution_status: r.job_execution_status,
    version: r.version,
    revision: r.revision,
    platform: r.platform,
    architecture: r.architecture,
    created_at: r.created_at,
    contacted_at: r.contacted_at,
    maximum_timeout: r.maximum_timeout,
    run_untagged: r.run_untagged,
    locked: r.locked,
    access_level: r.access_level,
    maintenance_note: r.maintenance_note,
    tag_list: Array.isArray(r.tag_list) ? r.tag_list.join(", ") : (r.tag_list || "")
  };
}

module.exports = {
  async gitlab_runner_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const runnerId = (d.runnerId || "").toString().trim();
    if (!runnerId) return { ok: false, error: "runnerId requis." };
    const res = await utils.gitlabApi('GET', '/runners/{runnerId}', inputs, opts?.credentials, {
      pathParams: ["runnerId"]
    });
    if (!res.ok) return res;
    return { ok: true, status: res.status, data: mapRunner(res.data || {}) };
  }
};
