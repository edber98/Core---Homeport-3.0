const { utils } = require("./utils");

module.exports = {
  async klaviyo_list_profiles_remove(node, msg, inputs, opts) {
    return utils.run("klaviyo_list_profiles_remove", inputs || {}, opts || {});
  }
};
