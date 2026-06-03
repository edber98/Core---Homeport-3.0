const { utils } = require("./utils");

module.exports = {
  async matomo_report_last_visits(node, msg, inputs, opts) {
    return utils.run("matomo_report_last_visits", inputs || {}, opts || {});
  }
};
