const { utils } = require("./utils");

module.exports = {
  async neo4j_relationships_delete(node, msg, inputs, opts) {
    return utils.run("neo4j_relationships_delete", inputs || {}, opts || {});
  }
};
