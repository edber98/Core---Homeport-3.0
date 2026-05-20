const { utils } = require("./utils");

module.exports = {
  async postgresql_records_update(node, msg, inputs, opts) {
    return utils.run("postgresql_records_update", inputs || {}, opts || {});
  }
};
