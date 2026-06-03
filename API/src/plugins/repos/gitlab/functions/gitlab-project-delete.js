const { utils } = require("./utils");

module.exports = {
  async gitlab_project_delete(node, msg, inputs, opts) {
    return utils.gitlabApi('DELETE', '/projects/{projectId}', inputs, opts?.credentials, {
      pathParams: ["projectId"]
    });
  }
};
