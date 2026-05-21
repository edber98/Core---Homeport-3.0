const { utils } = require("./utils");

module.exports = {
  async influxdb_delete_data(node, msg, inputs, opts) {
    return utils.run("influxdb_delete_data", inputs || {}, opts || {});
  }
};
