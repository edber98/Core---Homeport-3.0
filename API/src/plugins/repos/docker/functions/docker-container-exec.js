const { utils } = require("./utils");

module.exports = {
  async docker_container_exec(node, msg, inputs, opts) {
    return utils.run("docker_container_exec", inputs || {}, opts || {});
  }
};
