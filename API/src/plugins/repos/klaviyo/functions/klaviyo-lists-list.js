const { utils } = require("./utils");

module.exports = {
  async klaviyo_lists_list(node, msg, inputs, opts) {
    return utils.run("klaviyo_lists_list", inputs || {}, opts || {});
  }
};
