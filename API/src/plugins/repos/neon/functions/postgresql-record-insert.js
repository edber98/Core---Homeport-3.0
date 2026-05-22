const { utils } = require("./utils");

module.exports = {
  async neon_record_insert(node, msg, inputs, opts) {
    return utils.run("neon_record_insert", inputs || {}, opts || {});
  }
};
