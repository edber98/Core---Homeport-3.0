const { utils } = require("./utils");

module.exports = {
  async docker_network_connect(node, msg, inputs, opts) {
    return utils.run("docker_network_connect", inputs || {}, opts || {});
  }
};
