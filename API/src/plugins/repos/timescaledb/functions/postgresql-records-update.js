const { utils } = require("./utils");

module.exports = {
  async timescaledb_records_update(node, msg, inputs, opts) {
    return utils.run("timescaledb_records_update", inputs || {}, opts || {});
  }
};
