const { utils } = require("./utils");

module.exports = {
  async klaviyo_profile_create(node, msg, inputs, opts) {
    return utils.run("klaviyo_profile_create", inputs || {}, opts || {});
  }
};
