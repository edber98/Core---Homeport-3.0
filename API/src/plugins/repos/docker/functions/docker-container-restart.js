const { utils } = require("./utils");

module.exports = {
  async docker_container_restart(node, msg, inputs, opts) {
    return utils.run("docker_container_restart", inputs || {}, opts || {});
  }
};
