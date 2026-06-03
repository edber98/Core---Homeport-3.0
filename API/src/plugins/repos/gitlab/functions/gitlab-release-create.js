const { utils } = require("./utils");

module.exports = {
  async gitlab_release_create(node, msg, inputs, opts) {
    return utils.gitlabApi('POST', '/projects/{projectId}/releases', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["tag_name", "name", "description"]
    });
  }
};
