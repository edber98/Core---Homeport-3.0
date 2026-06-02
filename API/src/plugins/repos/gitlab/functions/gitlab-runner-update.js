const { utils } = require("./utils");

module.exports = {
  async gitlab_runner_update(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('PUT', '/runners/{runnerId}', inputs, opts?.credentials, {
      pathParams: ["runnerId"],
      bodyParams: ["description", "paused", "tag_list", "run_untagged", "locked", "access_level", "maximum_timeout", "maintenance_note", "active"]
    });
    if (!res.ok) return res;
    return { ok: true, status: res.status, data: res.data };
  }
};
