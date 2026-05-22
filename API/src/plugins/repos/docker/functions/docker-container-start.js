const { utils } = require("./utils");

module.exports = {
  async docker_container_start(node, msg, inputs, opts) {
    return utils.run("docker_container_start", inputs || {}, opts || {});
  }
};
