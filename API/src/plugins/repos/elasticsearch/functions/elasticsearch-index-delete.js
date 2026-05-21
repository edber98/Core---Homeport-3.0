const { utils } = require("./utils");

module.exports = {
  async elasticsearch_index_delete(node, msg, inputs, opts) {
    return utils.run("elasticsearch_index_delete", inputs || {}, opts || {});
  }
};
