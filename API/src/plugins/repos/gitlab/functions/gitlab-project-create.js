const { utils } = require("./utils");

module.exports = {
  async gitlab_project_create(node, msg, inputs, opts) {
    return utils.gitlabApi('POST', '/projects', inputs, opts?.credentials, {
      bodyParams: ["name", "description", "visibility", "initialize_with_readme"]
    });
  }
};
