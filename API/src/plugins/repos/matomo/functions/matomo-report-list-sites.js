const { utils } = require("./utils");

module.exports = {
  async matomo_report_list_sites(node, msg, inputs, opts) {
    return utils.run("matomo_report_list_sites", inputs || {}, opts || {});
  }
};
