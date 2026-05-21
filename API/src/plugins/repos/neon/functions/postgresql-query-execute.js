const { utils } = require("./utils");

module.exports = {
  async neon_query_execute(node, msg, inputs, opts) {
    return utils.run("neon_query_execute", inputs || {}, opts || {});
  }
};
