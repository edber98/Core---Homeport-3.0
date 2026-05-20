const { utils } = require("./utils");

module.exports = {
  async postgresql_query_execute(node, msg, inputs, opts) {
    return utils.run("postgresql_query_execute", inputs || {}, opts || {});
  }
};
