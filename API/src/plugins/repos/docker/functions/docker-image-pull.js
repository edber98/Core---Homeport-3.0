const { utils } = require("./utils");

module.exports = {
  async docker_image_pull(node, msg, inputs, opts) {
    return utils.run("docker_image_pull", inputs || {}, opts || {});
  }
};
