const { utils } = require("./utils");

module.exports = {
  async docker_volumes_list(node, msg, inputs, opts) {
    return utils.run("docker_volumes_list", inputs || {}, opts || {});
  }
};
