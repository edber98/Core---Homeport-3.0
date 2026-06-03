const { utils } = require("./utils");

module.exports = {
  async plausible_site_list_goals(node, msg, inputs, opts) {
    return utils.run("plausible_site_list_goals", inputs || {}, opts || {});
  }
};
