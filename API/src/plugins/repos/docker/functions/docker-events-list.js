const { utils } = require("./utils");

module.exports = {
  async docker_events_list(node, msg, inputs, opts) {
    return utils.run("docker_events_list", inputs || {}, opts || {});
  }
};
