const { utils } = require("./utils");

module.exports = {
  async gitlab_user_get(node, msg, inputs, opts) {
    const userId = inputs.userId;
    if (userId) {
      return utils.gitlabApi('GET', '/users/' + encodeURIComponent(userId), inputs, opts?.credentials);
    }
    return utils.gitlabApi('GET', '/user', inputs, opts?.credentials);
  }
};
