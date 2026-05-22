const { utils } = require("./utils");

module.exports = {
  async plausible_site_upsert_goal(node, msg, inputs, opts) {
    return utils.run("plausible_site_upsert_goal", inputs || {}, opts || {});
  }
};
