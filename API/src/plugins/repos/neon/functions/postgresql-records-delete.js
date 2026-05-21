const { utils } = require("./utils");

module.exports = {
  async neon_records_delete(node, msg, inputs, opts) {
    return utils.run("neon_records_delete", inputs || {}, opts || {});
  }
};
