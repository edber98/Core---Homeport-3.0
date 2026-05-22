const { utils } = require("./utils");

module.exports = {
  async matomo_report_query(node, msg, inputs, opts) {
    return utils.run("matomo_report_query", inputs || {}, opts || {});
  }
};
