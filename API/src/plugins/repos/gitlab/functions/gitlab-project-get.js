const { utils } = require("./utils");

module.exports = {
  async gitlab_project_get(node, msg, inputs, opts) {
    return utils.gitlabApi('GET', '/projects/{projectId}', inputs, opts?.credentials, {
      pathParams: ["projectId"]
    });
  }
};
