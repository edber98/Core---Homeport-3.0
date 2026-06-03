const { utils } = require("./utils");

module.exports = {
  async gitlab_runner_delete(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('DELETE', '/runners/{runnerId}', inputs, opts?.credentials, {
      pathParams: ["runnerId"]
    });
    if (!res.ok) return res;
    return { ok: true, status: res.status, data: { message: "Runner supprimé." } };
  }
};
