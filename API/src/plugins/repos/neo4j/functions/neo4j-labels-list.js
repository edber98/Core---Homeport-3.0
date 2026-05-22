const { utils } = require("./utils");

module.exports = {
  async neo4j_labels_list(node, msg, inputs, opts) {
    return utils.run("neo4j_labels_list", inputs || {}, opts || {});
  }
};
