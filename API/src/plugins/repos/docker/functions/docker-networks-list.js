const { utils } = require("./utils");

module.exports = {
  async docker_networks_list(node, msg, inputs, opts) {
    return utils.run("docker_networks_list", inputs || {}, opts || {});
  }
};
