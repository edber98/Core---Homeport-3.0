const { utils } = require("./utils");

module.exports = {
  async neo4j_query_write(node, msg, inputs, opts) {
    return utils.run("neo4j_query_write", inputs || {}, opts || {});
  }
};
