const { utils } = require("./utils");

module.exports = {
  async klaviyo_list_get(node, msg, inputs, opts) {
    return utils.run("klaviyo_list_get", inputs || {}, opts || {});
  }
};
