const { utils } = require("./utils");

module.exports = {
  async docker_network_remove(node, msg, inputs, opts) {
    return utils.run("docker_network_remove", inputs || {}, opts || {});
  }
};
