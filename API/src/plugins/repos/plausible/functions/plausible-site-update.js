const { utils } = require("./utils");

module.exports = {
  async plausible_site_update(node, msg, inputs, opts) {
    return utils.run("plausible_site_update", inputs || {}, opts || {});
  }
};
