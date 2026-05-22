const { utils } = require("./utils");

module.exports = {
  async docker_container_stop(node, msg, inputs, opts) {
    return utils.run("docker_container_stop", inputs || {}, opts || {});
  }
};
