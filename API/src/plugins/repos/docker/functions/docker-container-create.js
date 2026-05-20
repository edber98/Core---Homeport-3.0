const { utils } = require("./utils");

module.exports = {
  async docker_container_create(node, msg, inputs, opts) {
    return utils.run("docker_container_create", inputs || {}, opts || {});
  }
};
