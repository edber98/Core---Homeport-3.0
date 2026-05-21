const { utils } = require("./utils");

module.exports = {
  async matomo_tracking_track_pageview(node, msg, inputs, opts) {
    return utils.run("matomo_tracking_track_pageview", inputs || {}, opts || {});
  }
};
