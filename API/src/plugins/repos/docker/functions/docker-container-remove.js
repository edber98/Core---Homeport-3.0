const { utils } = require("./utils");

module.exports = {
  async docker_container_remove(node, msg, inputs, opts) {
    return utils.run("docker_container_remove", inputs || {}, opts || {});
  }
};
