const { utils } = require("./utils");

module.exports = {
  async matomo_tracking_track_event(node, msg, inputs, opts) {
    return utils.run("matomo_tracking_track_event", inputs || {}, opts || {});
  }
};
