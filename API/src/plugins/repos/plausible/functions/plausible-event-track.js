const { utils } = require("./utils");

module.exports = {
  async plausible_event_track(node, msg, inputs, opts) {
    return utils.run("plausible_event_track", inputs || {}, opts || {});
  }
};
