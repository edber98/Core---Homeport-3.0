const { utils } = require("./utils");

module.exports = {
  async plausible_site_list_guests(node, msg, inputs, opts) {
    return utils.run("plausible_site_list_guests", inputs || {}, opts || {});
  }
};
