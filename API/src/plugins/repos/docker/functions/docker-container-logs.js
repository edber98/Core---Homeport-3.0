const { utils } = require("./utils");

module.exports = {
  async docker_container_logs(node, msg, inputs, opts) {
    return utils.run("docker_container_logs", inputs || {}, opts || {});
  }
};
