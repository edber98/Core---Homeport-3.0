const { utils } = require("./utils");

module.exports = {
  async matomo_report_bulk_query(node, msg, inputs, opts) {
    return utils.run("matomo_report_bulk_query", inputs || {}, opts || {});
  }
};
