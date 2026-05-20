const { utils } = require("./utils");

module.exports = {
  async klaviyo_campaign_get(node, msg, inputs, opts) {
    return utils.run("klaviyo_campaign_get", inputs || {}, opts || {});
  }
};
