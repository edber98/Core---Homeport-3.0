const { utils } = require("./utils");

module.exports = {
  async timescaledb_records_select(node, msg, inputs, opts) {
    return utils.run("timescaledb_records_select", inputs || {}, opts || {});
  }
};
