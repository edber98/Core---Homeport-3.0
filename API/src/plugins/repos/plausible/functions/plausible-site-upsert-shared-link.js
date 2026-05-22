const { utils } = require("./utils");

module.exports = {
  async plausible_site_upsert_shared_link(node, msg, inputs, opts) {
    return utils.run("plausible_site_upsert_shared_link", inputs || {}, opts || {});
  }
};
