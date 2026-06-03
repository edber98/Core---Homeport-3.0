const { utils } = require("./utils");

module.exports = {
  async docker_system_info(node, msg, inputs, opts) {
    return utils.run("docker_system_info", inputs || {}, opts || {});
  }
};
