const { utils } = require("./utils");

module.exports = {
  async klaviyo_profile_get(node, msg, inputs, opts) {
    return utils.run("klaviyo_profile_get", inputs || {}, opts || {});
  }
};
