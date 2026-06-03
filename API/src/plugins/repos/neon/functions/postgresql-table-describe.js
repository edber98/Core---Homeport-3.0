const { utils } = require("./utils");

module.exports = {
  async neon_table_describe(node, msg, inputs, opts) {
    return utils.run("neon_table_describe", inputs || {}, opts || {});
  }
};
