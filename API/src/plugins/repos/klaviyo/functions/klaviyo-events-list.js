const { utils } = require("./utils");

module.exports = {
  async klaviyo_events_list(node, msg, inputs, opts) {
    return utils.run("klaviyo_events_list", inputs || {}, opts || {});
  }
};
