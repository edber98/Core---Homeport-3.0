const { utils } = require("./utils");

module.exports = {
  async plausible_stats_query(node, msg, inputs, opts) {
    return utils.run("plausible_stats_query", inputs || {}, opts || {});
  }
};
