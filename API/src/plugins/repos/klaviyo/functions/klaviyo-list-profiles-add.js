const { utils } = require("./utils");

module.exports = {
  async klaviyo_list_profiles_add(node, msg, inputs, opts) {
    return utils.run("klaviyo_list_profiles_add", inputs || {}, opts || {});
  }
};
