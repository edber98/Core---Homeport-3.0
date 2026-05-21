const { utils } = require("./utils");

module.exports = {
  async timescaledb_record_upsert(node, msg, inputs, opts) {
    return utils.run("timescaledb_record_upsert", inputs || {}, opts || {});
  }
};
