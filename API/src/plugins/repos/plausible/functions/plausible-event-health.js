const { utils } = require("./utils");

module.exports = {
  async plausible_event_health(node, msg, inputs, opts) {
    return utils.run("plausible_event_health", inputs || {}, opts || {});
  }
};
