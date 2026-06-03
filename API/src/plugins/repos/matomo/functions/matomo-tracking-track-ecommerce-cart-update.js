const { utils } = require("./utils");

module.exports = {
  async matomo_tracking_track_ecommerce_cart_update(node, msg, inputs, opts) {
    return utils.run("matomo_tracking_track_ecommerce_cart_update", inputs || {}, opts || {});
  }
};
