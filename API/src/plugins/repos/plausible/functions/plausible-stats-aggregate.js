const { utils } = require("./utils");

module.exports = {
  async plausible_stats_aggregate(node, msg, inputs, opts) {
    return utils.run("plausible_stats_aggregate", inputs || {}, opts || {});
  }
};
