const { utils } = require("./utils");

module.exports = {
  async neo4j_relationships_match(node, msg, inputs, opts) {
    return utils.run("neo4j_relationships_match", inputs || {}, opts || {});
  }
};
