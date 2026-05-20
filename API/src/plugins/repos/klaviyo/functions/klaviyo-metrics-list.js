const { utils } = require("./utils");

module.exports = {
  async klaviyo_metrics_list(node, msg, inputs, opts) {
    return utils.run("klaviyo_metrics_list", inputs || {}, opts || {});
  }
};
