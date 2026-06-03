const { utils } = require("./utils");

module.exports = {
  async plausible_site_list_custom_props(node, msg, inputs, opts) {
    return utils.run("plausible_site_list_custom_props", inputs || {}, opts || {});
  }
};
