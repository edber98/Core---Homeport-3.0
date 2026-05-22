const { utils } = require("./utils");

module.exports = {
  async plausible_site_get(node, msg, inputs, opts) {
    return utils.run("plausible_site_get", inputs || {}, opts || {});
  }
};
