const { utils } = require("./utils");

module.exports = {
  async postgresql_tables_list(node, msg, inputs, opts) {
    return utils.run("postgresql_tables_list", inputs || {}, opts || {});
  }
};
