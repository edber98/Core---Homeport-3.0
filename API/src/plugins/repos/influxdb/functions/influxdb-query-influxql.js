const { utils } = require("./utils");

module.exports = {
  async influxdb_query_influxql(node, msg, inputs, opts) {
    return utils.run("influxdb_query_influxql", inputs || {}, opts || {});
  }
};
