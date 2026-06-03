const { utils } = require("./utils");

module.exports = {
  async docker_system_version(node, msg, inputs, opts) {
    return utils.run("docker_system_version", inputs || {}, opts || {});
  }
};
