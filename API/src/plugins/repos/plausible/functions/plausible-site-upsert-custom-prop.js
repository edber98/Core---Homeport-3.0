const { utils } = require("./utils");

module.exports = {
  async plausible_site_upsert_custom_prop(node, msg, inputs, opts) {
    return utils.run("plausible_site_upsert_custom_prop", inputs || {}, opts || {});
  }
};
