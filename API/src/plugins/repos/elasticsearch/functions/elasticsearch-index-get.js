const { utils } = require("./utils");

module.exports = {
  async elasticsearch_index_get(node, msg, inputs, opts) {
    return utils.run("elasticsearch_index_get", inputs || {}, opts || {});
  }
};
