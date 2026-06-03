const { utils } = require("./utils");

module.exports = {
  async influxdb_buckets_list(node, msg, inputs, opts) {
    return utils.run("influxdb_buckets_list", inputs || {}, opts || {});
  }
};
