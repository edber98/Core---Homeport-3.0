const { utils } = require("./utils");

module.exports = {
  async influxdb_write_point(node, msg, inputs, opts) {
    return utils.run("influxdb_write_point", inputs || {}, opts || {});
  }
};
