const { utils } = require("./utils");

module.exports = {
  async klaviyo_campaign_send(node, msg, inputs, opts) {
    return utils.run("klaviyo_campaign_send", inputs || {}, opts || {});
  }
};
