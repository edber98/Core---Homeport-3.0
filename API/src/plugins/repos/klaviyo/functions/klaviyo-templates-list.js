const { utils } = require("./utils");

module.exports = {
  async klaviyo_templates_list(node, msg, inputs, opts) {
    return utils.run("klaviyo_templates_list", inputs || {}, opts || {});
  }
};
