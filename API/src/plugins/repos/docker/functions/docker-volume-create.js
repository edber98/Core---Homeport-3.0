const { utils } = require("./utils");

module.exports = {
  async docker_volume_create(node, msg, inputs, opts) {
    return utils.run("docker_volume_create", inputs || {}, opts || {});
  }
};
