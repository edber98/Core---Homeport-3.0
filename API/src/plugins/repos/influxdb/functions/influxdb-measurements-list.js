const { utils } = require("./utils");

module.exports = {
  async influxdb_measurements_list(node, msg, inputs, opts) {
    return utils.run("influxdb_measurements_list", inputs || {}, opts || {});
  }
};
