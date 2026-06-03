const { utils } = require("./utils");

module.exports = {
  async gitlab_group_get(node, msg, inputs, opts) {
    return utils.gitlabApi('GET', '/groups/{groupId}', inputs, opts?.credentials, {
      pathParams: ["groupId"]
    });
  }
};
