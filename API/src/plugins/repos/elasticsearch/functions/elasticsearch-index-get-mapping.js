const { utils } = require("./utils");

module.exports = {
  async elasticsearch_index_get_mapping(node, msg, inputs, opts) {
    return utils.run("elasticsearch_index_get_mapping", inputs || {}, opts || {});
  }
};
