const { utils } = require("./utils");

module.exports = {
  async matomo_tracking_track_ecommerce_order(node, msg, inputs, opts) {
    return utils.run("matomo_tracking_track_ecommerce_order", inputs || {}, opts || {});
  }
};
