const { utils } = require("./utils");

module.exports = {
  async klaviyo_campaigns_list(node, msg, inputs, opts) {
    return utils.run("klaviyo_campaigns_list", inputs || {}, opts || {});
  }
};
