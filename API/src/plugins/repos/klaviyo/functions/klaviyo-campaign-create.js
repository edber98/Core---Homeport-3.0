const { utils } = require("./utils");

module.exports = {
  async klaviyo_campaign_create(node, msg, inputs, opts) {
    return utils.run("klaviyo_campaign_create", inputs || {}, opts || {});
  }
};
