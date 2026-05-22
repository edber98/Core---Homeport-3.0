const { utils } = require("./utils");

module.exports = {
  async plausible_stats_realtime_visitors(node, msg, inputs, opts) {
    return utils.run("plausible_stats_realtime_visitors", inputs || {}, opts || {});
  }
};
