const { utils } = require("./utils");

module.exports = {
  async docker_images_list(node, msg, inputs, opts) {
    return utils.run("docker_images_list", inputs || {}, opts || {});
  }
};
