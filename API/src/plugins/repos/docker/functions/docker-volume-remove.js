const { utils } = require("./utils");

module.exports = {
  async docker_volume_remove(node, msg, inputs, opts) {
    return utils.run("docker_volume_remove", inputs || {}, opts || {});
  }
};
