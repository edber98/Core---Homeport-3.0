const { utils } = require("./utils");

module.exports = {
  async docker_containers_list(node, msg, inputs, opts) {
    return utils.run("docker_containers_list", inputs || {}, opts || {});
  }
};
