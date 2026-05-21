const { utils } = require("./utils");

module.exports = {
  async plausible_site_list(node, msg, inputs, opts) {
    return utils.run("plausible_site_list", inputs || {}, opts || {});
  }
};
