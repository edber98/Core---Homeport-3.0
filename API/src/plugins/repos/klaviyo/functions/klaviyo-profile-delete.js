const { utils } = require("./utils");

module.exports = {
  async klaviyo_profile_delete(node, msg, inputs, opts) {
    return utils.run("klaviyo_profile_delete", inputs || {}, opts || {});
  }
};
