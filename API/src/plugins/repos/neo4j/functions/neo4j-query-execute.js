const { utils } = require("./utils");

module.exports = {
  async neo4j_query_execute(node, msg, inputs, opts) {
    return utils.run("neo4j_query_execute", inputs || {}, opts || {});
  }
};
