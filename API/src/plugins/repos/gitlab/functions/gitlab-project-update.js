const { utils } = require("./utils");

module.exports = {
  async gitlab_project_update(node, msg, inputs, opts) {
    return utils.gitlabApi('PUT', '/projects/{projectId}', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["name", "description", "visibility"]
    });
  }
};
