const { utils } = require("./utils");

module.exports = {
  async postgresql_table_describe(node, msg, inputs, opts) {
    return utils.run("postgresql_table_describe", inputs || {}, opts || {});
  }
};
