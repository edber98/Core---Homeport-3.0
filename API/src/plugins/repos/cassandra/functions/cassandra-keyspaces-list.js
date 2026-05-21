const { utils } = require("./utils");

module.exports = {
  async cassandra_keyspaces_list(node, msg, inputs, opts) {
    return utils.run("cassandra_keyspaces_list", inputs || {}, opts || {});
  }
};
