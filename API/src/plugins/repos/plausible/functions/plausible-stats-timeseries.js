const { utils } = require("./utils");

module.exports = {
  async plausible_stats_timeseries(node, msg, inputs, opts) {
    return utils.run("plausible_stats_timeseries", inputs || {}, opts || {});
  }
};
