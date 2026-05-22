const { utils } = require("./utils");

module.exports = {
  async neo4j_node_create(node, msg, inputs, opts) {
    return utils.run("neo4j_node_create", inputs || {}, opts || {});
  }
};
