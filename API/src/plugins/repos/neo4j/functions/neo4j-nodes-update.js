const { utils } = require("./utils");

module.exports = {
  async neo4j_nodes_update(node, msg, inputs, opts) {
    return utils.run("neo4j_nodes_update", inputs || {}, opts || {});
  }
};
