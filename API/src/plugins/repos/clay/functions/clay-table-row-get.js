const { utils } = require("./utils");

module.exports = {
  async clay_table_row_get(node, msg, inputs, opts) {
    return utils.run("clay_table_row_get", inputs || {}, opts || {});
  }
};
