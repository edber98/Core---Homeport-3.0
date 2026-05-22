const { utils } = require("./utils");

module.exports = {
  async matomo_tracking_track_goal(node, msg, inputs, opts) {
    return utils.run("matomo_tracking_track_goal", inputs || {}, opts || {});
  }
};
