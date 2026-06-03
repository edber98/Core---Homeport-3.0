const { utils } = require("./utils");

module.exports = {
  async klaviyo_profiles_list(node, msg, inputs, opts) {
    return utils.run("klaviyo_profiles_list", inputs || {}, opts || {});
  }
};
