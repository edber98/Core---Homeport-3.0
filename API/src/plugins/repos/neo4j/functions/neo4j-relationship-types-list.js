const { utils } = require("./utils");

module.exports = {
  async neo4j_relationship_types_list(node, msg, inputs, opts) {
    return utils.run("neo4j_relationship_types_list", inputs || {}, opts || {});
  }
};
