const { utils } = require("./utils");

module.exports = {
  async plausible_site_create(node, msg, inputs, opts) {
    return utils.run("plausible_site_create", inputs || {}, opts || {});
  }
};
