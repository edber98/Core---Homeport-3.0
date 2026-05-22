const { utils } = require("./utils");

module.exports = {
  async influxdb_write_records(node, msg, inputs, opts) {
    return utils.run("influxdb_write_records", inputs || {}, opts || {});
  }
};
