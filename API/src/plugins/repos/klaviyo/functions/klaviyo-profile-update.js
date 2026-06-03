const { utils } = require("./utils");

module.exports = {
  async klaviyo_profile_update(node, msg, inputs, opts) {
    return utils.run("klaviyo_profile_update", inputs || {}, opts || {});
  }
};
