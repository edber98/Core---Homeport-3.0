const { utils } = require("./utils");

module.exports = {
  async plausible_site_delete(node, msg, inputs, opts) {
    return utils.run("plausible_site_delete", inputs || {}, opts || {});
  }
};
