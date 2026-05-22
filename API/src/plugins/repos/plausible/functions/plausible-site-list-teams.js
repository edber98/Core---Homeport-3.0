const { utils } = require("./utils");

module.exports = {
  async plausible_site_list_teams(node, msg, inputs, opts) {
    return utils.run("plausible_site_list_teams", inputs || {}, opts || {});
  }
};
