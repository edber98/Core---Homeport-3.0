const { utils } = require("./utils");

module.exports = {
  async elasticsearch_index_update_mapping(node, msg, inputs, opts) {
    return utils.run("elasticsearch_index_update_mapping", inputs || {}, opts || {});
  }
};
