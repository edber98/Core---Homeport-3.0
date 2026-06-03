const { utils } = require("./utils");

module.exports = {
  async plausible_stats_breakdown(node, msg, inputs, opts) {
    return utils.run("plausible_stats_breakdown", inputs || {}, opts || {});
  }
};
