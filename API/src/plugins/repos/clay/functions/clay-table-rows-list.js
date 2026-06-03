const { utils } = require("./utils");

module.exports = {
  async clay_table_rows_list(node, msg, inputs, opts) {
    return utils.run("clay_table_rows_list", inputs || {}, opts || {});
  }
};
