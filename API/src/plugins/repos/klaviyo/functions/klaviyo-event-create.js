const { utils } = require("./utils");

module.exports = {
  async klaviyo_event_create(node, msg, inputs, opts) {
    return utils.run("klaviyo_event_create", inputs || {}, opts || {});
  }
};
