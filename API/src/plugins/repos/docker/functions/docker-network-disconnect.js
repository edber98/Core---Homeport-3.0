const { utils } = require("./utils");

module.exports = {
  async docker_network_disconnect(node, msg, inputs, opts) {
    return utils.run("docker_network_disconnect", inputs || {}, opts || {});
  }
};
