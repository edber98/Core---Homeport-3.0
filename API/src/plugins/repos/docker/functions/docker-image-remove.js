const { utils } = require("./utils");

module.exports = {
  async docker_image_remove(node, msg, inputs, opts) {
    return utils.run("docker_image_remove", inputs || {}, opts || {});
  }
};
