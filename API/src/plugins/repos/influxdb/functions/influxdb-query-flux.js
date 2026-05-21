const { utils } = require("./utils");

module.exports = {
  async influxdb_query_flux(node, msg, inputs, opts) {
    return utils.run("influxdb_query_flux", inputs || {}, opts || {});
  }
};
